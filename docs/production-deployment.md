# Flight Search SaaS - Production Deployment Guide

## Overview

This document provides comprehensive instructions for deploying and managing the Flight Search SaaS platform in a production Kubernetes environment with full monitoring, backup, and disaster recovery capabilities.

## Prerequisites

### Infrastructure Requirements

- **Kubernetes Cluster**: v1.25+ with at least 3 worker nodes
- **Node Specifications**: 
  - Minimum 8 CPU cores and 16GB RAM per node
  - SSD storage with at least 500GB available
- **Load Balancer**: NGINX Ingress Controller
- **SSL/TLS**: cert-manager for automatic certificate management
- **Container Registry**: Docker registry for application images
- **Cloud Storage**: S3-compatible storage for backups

### Required Tools

```bash
# Install kubectl
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
chmod +x kubectl && sudo mv kubectl /usr/local/bin/

# Install Helm
curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash

# Install AWS CLI (for backups)
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip && sudo ./aws/install
```

## Pre-Deployment Setup

### 1. Create Namespace and Secrets

```bash
# Apply namespace
kubectl apply -f deployment/production/namespace.yaml

# Create secrets (replace with actual base64-encoded values)
kubectl apply -f deployment/production/secrets.yaml
```

### 2. Configure Storage Classes

```yaml
# Create fast-ssd storage class
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: fast-ssd
provisioner: kubernetes.io/aws-ebs
parameters:
  type: gp3
  iops: "3000"
  throughput: "125"
allowVolumeExpansion: true
```

### 3. Set up NGINX Ingress Controller

```bash
# Install NGINX Ingress Controller
helm upgrade --install ingress-nginx ingress-nginx \
  --repo https://kubernetes.github.io/ingress-nginx \
  --namespace ingress-nginx --create-namespace

# Install cert-manager for SSL
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.0/cert-manager.yaml
```

## Deployment Steps

### 1. Deploy Database Layer

```bash
# Deploy PostgreSQL
kubectl apply -f deployment/production/postgres.yaml

# Deploy Redis
kubectl apply -f deployment/production/redis.yaml

# Wait for databases to be ready
kubectl wait --for=condition=ready pod -l app=postgres -n flight-search-prod --timeout=300s
kubectl wait --for=condition=ready pod -l app=redis -n flight-search-prod --timeout=300s
```

### 2. Deploy Application Layer

```bash
# Apply configuration
kubectl apply -f deployment/production/configmap.yaml

# Deploy backend services
kubectl apply -f deployment/production/backend.yaml

# Deploy frontend
kubectl apply -f deployment/production/frontend.yaml

# Wait for applications to be ready
kubectl wait --for=condition=available deployment/flight-search-backend -n flight-search-prod --timeout=600s
kubectl wait --for=condition=available deployment/flight-search-frontend -n flight-search-prod --timeout=300s
```

### 3. Configure Ingress

```bash
# Deploy ingress configuration
kubectl apply -f deployment/production/ingress.yaml

# Verify ingress is working
kubectl get ingress -n flight-search-prod
```

### 4. Deploy Monitoring Stack

```bash
# Deploy Prometheus
kubectl apply -f deployment/production/monitoring/prometheus.yaml

# Deploy Grafana
kubectl apply -f deployment/production/monitoring/grafana.yaml

# Deploy Alertmanager
kubectl apply -f deployment/production/monitoring/alertmanager.yaml

# Deploy exporters
kubectl apply -f deployment/production/monitoring/node-exporter.yaml

# Deploy performance monitoring
kubectl apply -f deployment/production/monitoring/performance-monitoring.yaml
```

### 5. Set up Backup and Disaster Recovery

```bash
# Deploy backup jobs
kubectl apply -f deployment/production/backup/postgres-backup.yaml

# Deploy disaster recovery procedures
kubectl apply -f deployment/production/backup/disaster-recovery.yaml
```

## Post-Deployment Verification

### 1. Health Checks

```bash
# Check all pods are running
kubectl get pods -n flight-search-prod

# Check services
kubectl get services -n flight-search-prod

# Test application endpoints
curl -f https://api.flightsearch.com/api/health
curl -f https://flightsearch.com/health
```

### 2. Monitoring Verification

```bash
# Access Grafana (port-forward for initial setup)
kubectl port-forward -n flight-search-prod svc/grafana 3000:3000

# Access Prometheus
kubectl port-forward -n flight-search-prod svc/prometheus 9090:9090

# Check metrics are being collected
curl http://localhost:9090/api/v1/query?query=up
```

### 3. Backup Verification

```bash
# Trigger manual backup
kubectl create job --from=cronjob/postgres-backup manual-backup-$(date +%s) -n flight-search-prod

# Check backup job status
kubectl get jobs -n flight-search-prod

# Verify backup in S3
aws s3 ls s3://flight-search-backups/postgres-backups/
```

## Configuration Management

### Environment Variables

Key configuration is managed through ConfigMaps and Secrets:

- **ConfigMap**: `flight-search-config` - Non-sensitive configuration
- **Secrets**: `flight-search-secrets` - Sensitive data (API keys, passwords)

### Scaling Configuration

```bash
# Scale backend horizontally
kubectl scale deployment flight-search-backend --replicas=5 -n flight-search-prod

# Scale frontend
kubectl scale deployment flight-search-frontend --replicas=3 -n flight-search-prod

# Check HPA status
kubectl get hpa -n flight-search-prod
```

### Resource Limits

Current resource allocations:

- **Backend**: 1-2GB RAM, 0.5-1 CPU per pod
- **Frontend**: 256-512MB RAM, 0.1-0.2 CPU per pod
- **PostgreSQL**: 2-4GB RAM, 1-2 CPU
- **Redis**: 1-2GB RAM, 0.5-1 CPU
- **Monitoring**: 2-4GB RAM total, 1-2 CPU total

## Security Considerations

### Network Policies

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: flight-search-network-policy
  namespace: flight-search-prod
spec:
  podSelector: {}
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          name: ingress-nginx
  egress:
  - to: []
    ports:
    - protocol: TCP
      port: 53
    - protocol: UDP
      port: 53
```

### RBAC Configuration

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  namespace: flight-search-prod
  name: flight-search-role
rules:
- apiGroups: [""]
  resources: ["pods", "services", "configmaps"]
  verbs: ["get", "list", "watch"]
```

### Secret Management

- Use Kubernetes secrets for sensitive data
- Rotate secrets regularly (quarterly)
- Use external secret management (AWS Secrets Manager, HashiCorp Vault) for enhanced security

## Troubleshooting

### Common Issues

1. **Pod Startup Failures**
   ```bash
   kubectl describe pod <pod-name> -n flight-search-prod
   kubectl logs <pod-name> -n flight-search-prod
   ```

2. **Database Connection Issues**
   ```bash
   kubectl exec -it deployment/postgres -n flight-search-prod -- pg_isready
   kubectl exec -it deployment/redis -n flight-search-prod -- redis-cli ping
   ```

3. **Ingress Issues**
   ```bash
   kubectl describe ingress flight-search-ingress -n flight-search-prod
   kubectl logs -n ingress-nginx deployment/ingress-nginx-controller
   ```

### Performance Issues

1. **High CPU Usage**
   - Check HPA scaling
   - Review resource limits
   - Analyze application metrics in Grafana

2. **Memory Leaks**
   - Monitor memory usage trends
   - Check for memory leaks in application logs
   - Restart affected pods if necessary

3. **Database Performance**
   - Check slow query logs
   - Monitor connection pool usage
   - Consider read replicas for high read workloads

## Maintenance Procedures

### Regular Maintenance Tasks

1. **Weekly**
   - Review monitoring dashboards
   - Check backup success
   - Update security patches

2. **Monthly**
   - Rotate secrets
   - Review resource usage
   - Update dependencies

3. **Quarterly**
   - Disaster recovery testing
   - Security audit
   - Performance optimization review

### Update Procedures

1. **Application Updates**
   ```bash
   # Update backend
   kubectl set image deployment/flight-search-backend backend=flight-search/backend:v2.0.0 -n flight-search-prod
   kubectl rollout status deployment/flight-search-backend -n flight-search-prod
   
   # Rollback if needed
   kubectl rollout undo deployment/flight-search-backend -n flight-search-prod
   ```

2. **Database Updates**
   - Always backup before updates
   - Test migrations in staging first
   - Use blue-green deployment for zero downtime

## Monitoring and Alerting

### Key Metrics to Monitor

1. **Application Metrics**
   - Request rate and response time
   - Error rates
   - Active user sessions
   - Search success rate
   - Booking completion rate

2. **Infrastructure Metrics**
   - CPU and memory usage
   - Disk I/O and space
   - Network throughput
   - Database performance

3. **Business Metrics**
   - Daily active users
   - Revenue per booking
   - Search-to-booking conversion rate

### Alert Thresholds

- **Critical**: Error rate > 5%, Response time > 5s, Database down
- **Warning**: Error rate > 1%, Response time > 2s, High resource usage
- **Info**: Deployment events, Backup completion

## Disaster Recovery

### Recovery Time Objectives (RTO)

- **Database**: 15 minutes
- **Application**: 5 minutes
- **Full System**: 30 minutes

### Recovery Point Objectives (RPO)

- **Database**: 1 hour (hourly backups)
- **User Sessions**: 5 minutes (Redis persistence)

### Disaster Recovery Procedures

See `deployment/production/backup/disaster-recovery.yaml` for detailed scripts and procedures.

## Support and Escalation

### Contact Information

- **On-call Engineer**: +1-XXX-XXX-XXXX
- **DevOps Team**: devops@flightsearch.com
- **Emergency Escalation**: emergency@flightsearch.com

### Escalation Matrix

1. **Level 1**: Application issues, minor performance problems
2. **Level 2**: Database issues, significant performance degradation
3. **Level 3**: Complete system outage, security incidents

## Appendix

### Useful Commands

```bash
# Get all resources in namespace
kubectl get all -n flight-search-prod

# Check resource usage
kubectl top pods -n flight-search-prod
kubectl top nodes

# View logs
kubectl logs -f deployment/flight-search-backend -n flight-search-prod

# Execute commands in pods
kubectl exec -it deployment/flight-search-backend -n flight-search-prod -- /bin/bash

# Port forwarding for debugging
kubectl port-forward svc/flight-search-backend-service 3000:3000 -n flight-search-prod
```

### Configuration Files Reference

- `namespace.yaml`: Kubernetes namespace definition
- `configmap.yaml`: Application configuration
- `secrets.yaml`: Sensitive configuration data
- `postgres.yaml`: PostgreSQL database deployment
- `redis.yaml`: Redis cache deployment
- `backend.yaml`: Backend application deployment
- `frontend.yaml`: Frontend application deployment
- `ingress.yaml`: Ingress configuration for external access
- `monitoring/`: Complete monitoring stack configuration
- `backup/`: Backup and disaster recovery configuration