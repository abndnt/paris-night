# Flight Search SaaS - Production Deployment

This directory contains all the necessary configuration files and scripts for deploying the Flight Search SaaS platform to a production Kubernetes environment.

## Quick Start

1. **Prerequisites**: Ensure you have kubectl, helm, and aws CLI installed and configured
2. **Configure Secrets**: Update `secrets.yaml` with your actual base64-encoded secrets
3. **Run Deployment**: Execute `./deploy.sh` from this directory
4. **Verify**: Check the deployment status and run health checks

## Directory Structure

```
deployment/production/
├── README.md                    # This file
├── deploy.sh                    # Automated deployment script
├── namespace.yaml               # Kubernetes namespace
├── configmap.yaml              # Application configuration
├── secrets.yaml                # Sensitive configuration (update with real values)
├── postgres.yaml               # PostgreSQL database deployment
├── redis.yaml                  # Redis cache deployment
├── backend.yaml                # Backend application deployment
├── frontend.yaml               # Frontend application deployment
├── ingress.yaml                # Ingress configuration for external access
├── monitoring/                 # Monitoring stack configuration
│   ├── prometheus.yaml         # Prometheus monitoring
│   ├── grafana.yaml           # Grafana dashboards
│   ├── alertmanager.yaml      # Alert management
│   ├── node-exporter.yaml     # Node metrics exporter
│   ├── performance-monitoring.yaml # APM and performance monitoring
│   └── monitoring-dashboard.json  # Grafana dashboard configuration
└── backup/                     # Backup and disaster recovery
    ├── postgres-backup.yaml    # Database backup jobs
    └── disaster-recovery.yaml  # Disaster recovery procedures
```

## Configuration Requirements

### 1. Secrets Configuration

Before deployment, update `secrets.yaml` with actual base64-encoded values:

```bash
# Example: Generate base64 encoded JWT secret
echo -n "your-jwt-secret-here" | base64

# Update secrets.yaml with the generated values
```

Required secrets:
- `JWT_SECRET`: JWT signing secret
- `DB_PASSWORD`: PostgreSQL password
- `REDIS_PASSWORD`: Redis password
- `STRIPE_SECRET_KEY`: Stripe payment processing key
- `REQUESTY_API_KEY`: Requesty LLM service API key
- `ENCRYPTION_KEY`: Data encryption key
- `SMTP_PASSWORD`: Email service password
- `SENTRY_DSN`: Error tracking service DSN

### 2. Environment Configuration

Update `configmap.yaml` with your environment-specific values:
- Domain names
- API endpoints
- Rate limiting settings
- Cache TTL values

### 3. Storage Configuration

Ensure your Kubernetes cluster has:
- A `fast-ssd` storage class for high-performance storage
- Sufficient storage capacity for databases and monitoring

## Deployment Process

### Automated Deployment

```bash
# Run the automated deployment script
./deploy.sh

# Skip monitoring stack (optional)
./deploy.sh --skip-monitoring

# Skip backup configuration (optional)
./deploy.sh --skip-backup
```

### Manual Deployment

If you prefer manual deployment:

```bash
# 1. Create namespace and basic resources
kubectl apply -f namespace.yaml
kubectl apply -f configmap.yaml
kubectl apply -f secrets.yaml

# 2. Deploy databases
kubectl apply -f postgres.yaml
kubectl apply -f redis.yaml

# 3. Deploy applications
kubectl apply -f backend.yaml
kubectl apply -f frontend.yaml

# 4. Configure ingress
kubectl apply -f ingress.yaml

# 5. Deploy monitoring (optional)
kubectl apply -f monitoring/

# 6. Setup backup (optional)
kubectl apply -f backup/
```

## Post-Deployment Configuration

### 1. DNS Configuration

Point your domain names to the ingress load balancer:

```bash
# Get ingress IP/hostname
kubectl get ingress flight-search-ingress -n flight-search-prod

# Configure DNS records:
# A record: flightsearch.com -> <INGRESS_IP>
# A record: api.flightsearch.com -> <INGRESS_IP>
```

### 2. SSL Certificate Verification

```bash
# Check certificate status
kubectl get certificates -n flight-search-prod
kubectl describe certificate flight-search-tls -n flight-search-prod
```

### 3. Monitoring Setup

Access monitoring dashboards:

```bash
# Grafana (default admin/admin)
kubectl port-forward -n flight-search-prod svc/grafana 3000:3000

# Prometheus
kubectl port-forward -n flight-search-prod svc/prometheus 9090:9090

# Kibana (for performance monitoring)
kubectl port-forward -n flight-search-prod svc/kibana 5601:5601
```

### 4. Backup Verification

```bash
# Check backup jobs
kubectl get cronjobs -n flight-search-prod

# Trigger manual backup
kubectl create job --from=cronjob/postgres-backup manual-backup-$(date +%s) -n flight-search-prod

# Verify backup in S3
aws s3 ls s3://flight-search-backups/postgres-backups/
```

## Scaling and Performance

### Horizontal Pod Autoscaling

The deployment includes HPA configurations:

```bash
# Check HPA status
kubectl get hpa -n flight-search-prod

# Manual scaling
kubectl scale deployment flight-search-backend --replicas=5 -n flight-search-prod
```

### Resource Monitoring

Monitor resource usage:

```bash
# Pod resource usage
kubectl top pods -n flight-search-prod

# Node resource usage
kubectl top nodes
```

## Troubleshooting

### Common Issues

1. **Pods not starting**:
   ```bash
   kubectl describe pod <pod-name> -n flight-search-prod
   kubectl logs <pod-name> -n flight-search-prod
   ```

2. **Database connection issues**:
   ```bash
   kubectl exec -it deployment/postgres -n flight-search-prod -- pg_isready
   ```

3. **Ingress not working**:
   ```bash
   kubectl describe ingress flight-search-ingress -n flight-search-prod
   kubectl logs -n ingress-nginx deployment/ingress-nginx-controller
   ```

### Health Checks

```bash
# Application health
curl -f https://api.flightsearch.com/api/health
curl -f https://flightsearch.com/health

# Database health
kubectl exec deployment/postgres -n flight-search-prod -- pg_isready

# Redis health
kubectl exec deployment/redis -n flight-search-prod -- redis-cli ping
```

## Security Considerations

### Network Policies

The deployment includes network policies to restrict pod-to-pod communication. Review and adjust as needed.

### Secret Management

- Rotate secrets regularly (quarterly recommended)
- Use external secret management systems for enhanced security
- Monitor secret access and usage

### RBAC

Review and adjust RBAC permissions in the monitoring configurations.

## Backup and Disaster Recovery

### Backup Schedule

- PostgreSQL: Daily at 2:00 AM UTC
- Redis: Daily at 3:00 AM UTC
- Retention: 30 days for PostgreSQL, 7 days for Redis

### Recovery Procedures

See `backup/disaster-recovery.yaml` for detailed recovery scripts and procedures.

### Testing Recovery

Regularly test backup and recovery procedures:

```bash
# Test database restore (in staging environment)
./restore-postgres.sh <backup-file-name>
```

## Monitoring and Alerting

### Key Metrics

- Request rate and response time
- Error rates
- Resource utilization
- Database performance
- Business metrics (DAU, conversion rates)

### Alert Configuration

Alerts are configured for:
- **Critical**: System outages, high error rates, database failures
- **Warning**: Performance degradation, high resource usage
- **Info**: Deployment events, backup completion

### Dashboard Access

- **Grafana**: Production monitoring dashboard
- **Prometheus**: Metrics and alerting
- **Kibana**: Application performance monitoring

## Maintenance

### Regular Tasks

- **Daily**: Health checks, log review
- **Weekly**: Security updates, resource optimization
- **Monthly**: Secret rotation, performance review
- **Quarterly**: Disaster recovery testing, security audit

### Update Procedures

```bash
# Application updates
kubectl set image deployment/flight-search-backend backend=flight-search/backend:v2.0.0 -n flight-search-prod

# Rollback if needed
kubectl rollout undo deployment/flight-search-backend -n flight-search-prod
```

## Support

For issues and support:
- **Documentation**: See `docs/production-deployment.md` and `docs/production-runbooks.md`
- **Monitoring**: Check Grafana dashboards for system health
- **Logs**: Use `kubectl logs` to investigate issues
- **Emergency**: Follow escalation procedures in runbooks

## Resource Requirements

### Minimum Cluster Requirements

- **Nodes**: 3 worker nodes
- **CPU**: 8 cores per node
- **Memory**: 16GB per node
- **Storage**: 500GB SSD per node

### Application Resource Allocation

- **Backend**: 1-2GB RAM, 0.5-1 CPU per pod (3-10 replicas)
- **Frontend**: 256-512MB RAM, 0.1-0.2 CPU per pod (2-5 replicas)
- **PostgreSQL**: 2-4GB RAM, 1-2 CPU
- **Redis**: 1-2GB RAM, 0.5-1 CPU
- **Monitoring**: 4-8GB RAM total, 2-4 CPU total

## Performance Baselines

### Normal Operating Parameters

- **Response Time**: < 500ms (95th percentile)
- **Error Rate**: < 0.1%
- **CPU Usage**: < 70% average
- **Memory Usage**: < 80% average
- **Cache Hit Rate**: > 90%

### Alert Thresholds

- **Critical**: Response time > 5s, Error rate > 5%
- **Warning**: Response time > 2s, Error rate > 1%
- **Info**: Deployment events, Certificate expiration