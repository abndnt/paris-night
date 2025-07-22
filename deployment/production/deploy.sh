#!/bin/bash

# Flight Search SaaS - Production Deployment Script
# This script automates the deployment of the Flight Search SaaS platform to production

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
NAMESPACE="flight-search-prod"
TIMEOUT="600s"
BACKUP_BUCKET="flight-search-backups"

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if kubectl is available
check_prerequisites() {
    print_status "Checking prerequisites..."
    
    if ! command -v kubectl &> /dev/null; then
        print_error "kubectl is not installed or not in PATH"
        exit 1
    fi
    
    if ! command -v helm &> /dev/null; then
        print_error "helm is not installed or not in PATH"
        exit 1
    fi
    
    if ! command -v aws &> /dev/null; then
        print_error "aws CLI is not installed or not in PATH"
        exit 1
    fi
    
    # Check cluster connectivity
    if ! kubectl cluster-info &> /dev/null; then
        print_error "Cannot connect to Kubernetes cluster"
        exit 1
    fi
    
    print_success "Prerequisites check passed"
}

# Function to create namespace and basic resources
setup_namespace() {
    print_status "Setting up namespace and basic resources..."
    
    kubectl apply -f namespace.yaml
    kubectl apply -f configmap.yaml
    
    # Check if secrets exist, if not, warn user
    if ! kubectl get secret flight-search-secrets -n $NAMESPACE &> /dev/null; then
        print_warning "Secrets not found. Please ensure secrets.yaml is configured with actual values and apply it manually:"
        print_warning "kubectl apply -f secrets.yaml"
        read -p "Press Enter to continue after applying secrets..."
    fi
    
    print_success "Namespace and basic resources configured"
}

# Function to deploy databases
deploy_databases() {
    print_status "Deploying databases..."
    
    # Deploy PostgreSQL
    kubectl apply -f postgres.yaml
    print_status "Waiting for PostgreSQL to be ready..."
    kubectl wait --for=condition=ready pod -l app=postgres -n $NAMESPACE --timeout=$TIMEOUT
    
    # Deploy Redis
    kubectl apply -f redis.yaml
    print_status "Waiting for Redis to be ready..."
    kubectl wait --for=condition=ready pod -l app=redis -n $NAMESPACE --timeout=$TIMEOUT
    
    print_success "Databases deployed successfully"
}

# Function to deploy applications
deploy_applications() {
    print_status "Deploying applications..."
    
    # Deploy backend
    kubectl apply -f backend.yaml
    print_status "Waiting for backend to be ready..."
    kubectl wait --for=condition=available deployment/flight-search-backend -n $NAMESPACE --timeout=$TIMEOUT
    
    # Deploy frontend
    kubectl apply -f frontend.yaml
    print_status "Waiting for frontend to be ready..."
    kubectl wait --for=condition=available deployment/flight-search-frontend -n $NAMESPACE --timeout=$TIMEOUT
    
    print_success "Applications deployed successfully"
}

# Function to configure ingress
setup_ingress() {
    print_status "Setting up ingress..."
    
    # Check if NGINX Ingress Controller is installed
    if ! kubectl get namespace ingress-nginx &> /dev/null; then
        print_warning "NGINX Ingress Controller not found. Installing..."
        helm upgrade --install ingress-nginx ingress-nginx \
            --repo https://kubernetes.github.io/ingress-nginx \
            --namespace ingress-nginx --create-namespace
        
        print_status "Waiting for NGINX Ingress Controller to be ready..."
        kubectl wait --namespace ingress-nginx \
            --for=condition=ready pod \
            --selector=app.kubernetes.io/component=controller \
            --timeout=300s
    fi
    
    # Apply ingress configuration
    kubectl apply -f ingress.yaml
    
    print_success "Ingress configured successfully"
}

# Function to deploy monitoring stack
deploy_monitoring() {
    print_status "Deploying monitoring stack..."
    
    # Deploy Prometheus
    kubectl apply -f monitoring/prometheus.yaml
    print_status "Waiting for Prometheus to be ready..."
    kubectl wait --for=condition=ready pod -l app=prometheus -n $NAMESPACE --timeout=$TIMEOUT
    
    # Deploy Grafana
    kubectl apply -f monitoring/grafana.yaml
    print_status "Waiting for Grafana to be ready..."
    kubectl wait --for=condition=ready pod -l app=grafana -n $NAMESPACE --timeout=$TIMEOUT
    
    # Deploy Alertmanager
    kubectl apply -f monitoring/alertmanager.yaml
    print_status "Waiting for Alertmanager to be ready..."
    kubectl wait --for=condition=ready pod -l app=alertmanager -n $NAMESPACE --timeout=$TIMEOUT
    
    # Deploy exporters
    kubectl apply -f monitoring/node-exporter.yaml
    
    # Deploy performance monitoring
    kubectl apply -f monitoring/performance-monitoring.yaml
    
    print_success "Monitoring stack deployed successfully"
}

# Function to setup backup and disaster recovery
setup_backup() {
    print_status "Setting up backup and disaster recovery..."
    
    # Check if S3 bucket exists
    if ! aws s3 ls s3://$BACKUP_BUCKET &> /dev/null; then
        print_warning "Backup bucket s3://$BACKUP_BUCKET not found. Creating..."
        aws s3 mb s3://$BACKUP_BUCKET
        
        # Enable versioning
        aws s3api put-bucket-versioning \
            --bucket $BACKUP_BUCKET \
            --versioning-configuration Status=Enabled
    fi
    
    # Deploy backup jobs
    kubectl apply -f backup/postgres-backup.yaml
    kubectl apply -f backup/disaster-recovery.yaml
    
    print_success "Backup and disaster recovery configured"
}

# Function to run health checks
run_health_checks() {
    print_status "Running health checks..."
    
    # Check all pods are running
    print_status "Checking pod status..."
    kubectl get pods -n $NAMESPACE
    
    # Check services
    print_status "Checking services..."
    kubectl get services -n $NAMESPACE
    
    # Test application endpoints (with retries)
    print_status "Testing application endpoints..."
    
    # Get ingress IP
    INGRESS_IP=$(kubectl get ingress flight-search-ingress -n $NAMESPACE -o jsonpath='{.status.loadBalancer.ingress[0].ip}')
    if [ -z "$INGRESS_IP" ]; then
        INGRESS_IP=$(kubectl get ingress flight-search-ingress -n $NAMESPACE -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')
    fi
    
    if [ -n "$INGRESS_IP" ]; then
        print_status "Testing health endpoints on $INGRESS_IP..."
        
        # Test with retries
        for i in {1..5}; do
            if curl -f -H "Host: api.flightsearch.com" http://$INGRESS_IP/api/health &> /dev/null; then
                print_success "API health check passed"
                break
            else
                print_warning "API health check failed, attempt $i/5"
                sleep 10
            fi
        done
        
        for i in {1..5}; do
            if curl -f -H "Host: flightsearch.com" http://$INGRESS_IP/health &> /dev/null; then
                print_success "Frontend health check passed"
                break
            else
                print_warning "Frontend health check failed, attempt $i/5"
                sleep 10
            fi
        done
    else
        print_warning "Could not determine ingress IP for health checks"
    fi
    
    print_success "Health checks completed"
}

# Function to display deployment summary
show_summary() {
    print_status "Deployment Summary"
    echo "===================="
    
    echo "Namespace: $NAMESPACE"
    echo "Pods:"
    kubectl get pods -n $NAMESPACE -o wide
    
    echo ""
    echo "Services:"
    kubectl get services -n $NAMESPACE
    
    echo ""
    echo "Ingress:"
    kubectl get ingress -n $NAMESPACE
    
    echo ""
    echo "Persistent Volumes:"
    kubectl get pvc -n $NAMESPACE
    
    echo ""
    echo "HPA Status:"
    kubectl get hpa -n $NAMESPACE
    
    echo ""
    print_success "Deployment completed successfully!"
    
    echo ""
    echo "Next Steps:"
    echo "1. Configure DNS to point to the ingress IP/hostname"
    echo "2. Verify SSL certificates are issued correctly"
    echo "3. Run comprehensive smoke tests"
    echo "4. Set up monitoring alerts and notifications"
    echo "5. Test backup and recovery procedures"
    
    echo ""
    echo "Useful Commands:"
    echo "- View logs: kubectl logs -f deployment/flight-search-backend -n $NAMESPACE"
    echo "- Scale application: kubectl scale deployment flight-search-backend --replicas=5 -n $NAMESPACE"
    echo "- Access Grafana: kubectl port-forward -n $NAMESPACE svc/grafana 3000:3000"
    echo "- Access Prometheus: kubectl port-forward -n $NAMESPACE svc/prometheus 9090:9090"
}

# Function to handle cleanup on failure
cleanup_on_failure() {
    print_error "Deployment failed. Cleaning up..."
    
    # Optionally remove resources (uncomment if desired)
    # kubectl delete namespace $NAMESPACE --ignore-not-found=true
    
    print_error "Please check the logs and fix any issues before retrying"
    exit 1
}

# Main deployment function
main() {
    print_status "Starting Flight Search SaaS Production Deployment"
    print_status "=================================================="
    
    # Set trap for cleanup on failure
    trap cleanup_on_failure ERR
    
    # Check if we're in the right directory
    if [ ! -f "namespace.yaml" ]; then
        print_error "Please run this script from the deployment/production directory"
        exit 1
    fi
    
    # Parse command line arguments
    SKIP_MONITORING=false
    SKIP_BACKUP=false
    
    while [[ $# -gt 0 ]]; do
        case $1 in
            --skip-monitoring)
                SKIP_MONITORING=true
                shift
                ;;
            --skip-backup)
                SKIP_BACKUP=true
                shift
                ;;
            --help)
                echo "Usage: $0 [OPTIONS]"
                echo "Options:"
                echo "  --skip-monitoring    Skip monitoring stack deployment"
                echo "  --skip-backup        Skip backup configuration"
                echo "  --help              Show this help message"
                exit 0
                ;;
            *)
                print_error "Unknown option: $1"
                exit 1
                ;;
        esac
    done
    
    # Run deployment steps
    check_prerequisites
    setup_namespace
    deploy_databases
    deploy_applications
    setup_ingress
    
    if [ "$SKIP_MONITORING" = false ]; then
        deploy_monitoring
    else
        print_warning "Skipping monitoring stack deployment"
    fi
    
    if [ "$SKIP_BACKUP" = false ]; then
        setup_backup
    else
        print_warning "Skipping backup configuration"
    fi
    
    run_health_checks
    show_summary
}

# Run main function
main "$@"