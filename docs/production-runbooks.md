# Flight Search SaaS - Production Runbooks

## Overview

This document contains operational runbooks for managing the Flight Search SaaS platform in production. These procedures are designed to help operations teams quickly respond to incidents and perform routine maintenance tasks.

## Emergency Response Procedures

### 🚨 Complete System Outage

**Symptoms:**
- Application completely inaccessible
- All health checks failing
- Multiple alerts firing

**Immediate Actions:**
1. **Assess Scope** (2 minutes)
   ```bash
   kubectl get nodes
   kubectl get pods -n flight-search-prod
   kubectl get services -n flight-search-prod
   ```

2. **Check Infrastructure** (3 minutes)
   ```bash
   # Check cluster health
   kubectl cluster-info
   
   # Check ingress controller
   kubectl get pods -n ingress-nginx
   
   # Check DNS resolution
   nslookup flightsearch.com
   ```

3. **Execute Disaster Recovery** (15 minutes)
   ```bash
   cd /opt/disaster-recovery
   ./failover-procedure.sh
   ```

4. **Communicate Status** (1 minute)
   - Update status page
   - Notify stakeholders via Slack
   - Send customer communication if needed

**Recovery Steps:**
1. Follow disaster recovery procedures in `/deployment/production/backup/disaster-recovery.yaml`
2. Verify all services are healthy
3. Run comprehensive health checks
4. Monitor for 30 minutes post-recovery

### 🔥 High Error Rate (>5%)

**Symptoms:**
- Error rate alerts firing
- Customer complaints increasing
- Degraded user experience

**Immediate Actions:**
1. **Identify Error Source** (2 minutes)
   ```bash
   # Check application logs
   kubectl logs -f deployment/flight-search-backend -n flight-search-prod --tail=100
   
   # Check error metrics in Grafana
   # Navigate to Error Rate dashboard
   ```

2. **Check Dependencies** (3 minutes)
   ```bash
   # Test database connectivity
   kubectl exec deployment/postgres -n flight-search-prod -- pg_isready
   
   # Test Redis connectivity
   kubectl exec deployment/redis -n flight-search-prod -- redis-cli ping
   
   # Check external API status
   curl -I https://api.requesty.com/health
   ```

3. **Scale Resources** (2 minutes)
   ```bash
   # Scale backend if resource constrained
   kubectl scale deployment flight-search-backend --replicas=6 -n flight-search-prod
   ```

4. **Rollback if Recent Deployment** (5 minutes)
   ```bash
   # Check recent deployments
   kubectl rollout history deployment/flight-search-backend -n flight-search-prod
   
   # Rollback if needed
   kubectl rollout undo deployment/flight-search-backend -n flight-search-prod
   ```

### 💾 Database Issues

**Symptoms:**
- Database connection errors
- Slow query performance
- Database alerts firing

**Immediate Actions:**
1. **Check Database Health** (2 minutes)
   ```bash
   kubectl exec deployment/postgres -n flight-search-prod -- pg_isready
   kubectl logs deployment/postgres -n flight-search-prod --tail=50
   ```

2. **Check Resource Usage** (2 minutes)
   ```bash
   kubectl top pod -n flight-search-prod | grep postgres
   kubectl describe pod -l app=postgres -n flight-search-prod
   ```

3. **Check Active Connections** (1 minute)
   ```bash
   kubectl exec deployment/postgres -n flight-search-prod -- psql -U $POSTGRES_USER -d flight_search_prod -c "SELECT count(*) FROM pg_stat_activity;"
   ```

4. **Restart if Necessary** (5 minutes)
   ```bash
   kubectl rollout restart deployment/postgres -n flight-search-prod
   kubectl wait --for=condition=ready pod -l app=postgres -n flight-search-prod --timeout=300s
   ```

**Recovery Steps:**
1. If corruption suspected, restore from latest backup
2. Monitor query performance
3. Consider scaling read replicas if high read load

### 🔄 High Response Time (>2s)

**Symptoms:**
- Response time alerts
- User complaints about slow performance
- Timeout errors

**Immediate Actions:**
1. **Check Resource Usage** (2 minutes)
   ```bash
   kubectl top pods -n flight-search-prod
   kubectl top nodes
   ```

2. **Scale Application** (2 minutes)
   ```bash
   kubectl scale deployment flight-search-backend --replicas=5 -n flight-search-prod
   kubectl scale deployment flight-search-frontend --replicas=4 -n flight-search-prod
   ```

3. **Check Cache Performance** (2 minutes)
   ```bash
   kubectl exec deployment/redis -n flight-search-prod -- redis-cli info stats
   kubectl exec deployment/redis -n flight-search-prod -- redis-cli info memory
   ```

4. **Analyze Slow Queries** (3 minutes)
   ```bash
   kubectl exec deployment/postgres -n flight-search-prod -- psql -U $POSTGRES_USER -d flight_search_prod -c "SELECT query, mean_time, calls FROM pg_stat_statements ORDER BY mean_time DESC LIMIT 10;"
   ```

## Routine Maintenance Procedures

### 📅 Daily Health Checks

**Schedule:** Every day at 9:00 AM

**Checklist:**
1. **System Health**
   ```bash
   kubectl get pods -n flight-search-prod
   kubectl get nodes
   kubectl get pvc -n flight-search-prod
   ```

2. **Application Health**
   ```bash
   curl -f https://api.flightsearch.com/api/health
   curl -f https://flightsearch.com/health
   ```

3. **Monitoring Systems**
   ```bash
   curl -f http://prometheus:9090/-/healthy
   curl -f http://grafana:3000/api/health
   ```

4. **Backup Status**
   ```bash
   kubectl get jobs -n flight-search-prod | grep backup
   aws s3 ls s3://flight-search-backups/postgres-backups/ | tail -5
   ```

5. **Resource Usage Review**
   - Check Grafana dashboards
   - Review resource utilization trends
   - Identify any anomalies

### 🔄 Weekly Maintenance

**Schedule:** Every Sunday at 2:00 AM

**Tasks:**
1. **Update System Packages**
   ```bash
   # Update node packages (if using managed nodes, this may be automatic)
   kubectl get nodes -o wide
   ```

2. **Clean Up Old Resources**
   ```bash
   # Clean up completed jobs
   kubectl delete jobs --field-selector status.successful=1 -n flight-search-prod
   
   # Clean up old replica sets
   kubectl delete rs --all -n flight-search-prod --cascade=false
   ```

3. **Review Logs**
   ```bash
   # Check for recurring errors
   kubectl logs deployment/flight-search-backend -n flight-search-prod --since=168h | grep ERROR | sort | uniq -c | sort -nr
   ```

4. **Security Scan**
   ```bash
   # Run security scan on images
   docker scan flight-search/backend:latest
   docker scan flight-search/frontend:latest
   ```

### 🗓️ Monthly Maintenance

**Schedule:** First Sunday of each month at 1:00 AM

**Tasks:**
1. **Secret Rotation**
   ```bash
   # Generate new JWT secret
   NEW_JWT_SECRET=$(openssl rand -base64 32)
   kubectl patch secret flight-search-secrets -n flight-search-prod -p='{"data":{"JWT_SECRET":"'$(echo -n $NEW_JWT_SECRET | base64)'"}}'
   
   # Rolling restart to pick up new secret
   kubectl rollout restart deployment/flight-search-backend -n flight-search-prod
   ```

2. **Certificate Renewal Check**
   ```bash
   kubectl get certificates -n flight-search-prod
   kubectl describe certificate flight-search-tls -n flight-search-prod
   ```

3. **Database Maintenance**
   ```bash
   # Run VACUUM and ANALYZE
   kubectl exec deployment/postgres -n flight-search-prod -- psql -U $POSTGRES_USER -d flight_search_prod -c "VACUUM ANALYZE;"
   
   # Update statistics
   kubectl exec deployment/postgres -n flight-search-prod -- psql -U $POSTGRES_USER -d flight_search_prod -c "ANALYZE;"
   ```

4. **Performance Review**
   - Review Grafana dashboards for trends
   - Analyze slow queries and optimize
   - Review and adjust resource limits

## Deployment Procedures

### 🚀 Application Deployment

**Pre-deployment Checklist:**
- [ ] Code reviewed and approved
- [ ] Tests passing in CI/CD
- [ ] Staging environment tested
- [ ] Database migrations tested
- [ ] Rollback plan prepared

**Deployment Steps:**
1. **Backup Current State**
   ```bash
   # Create manual backup
   kubectl create job --from=cronjob/postgres-backup pre-deploy-backup-$(date +%s) -n flight-search-prod
   ```

2. **Deploy Backend**
   ```bash
   kubectl set image deployment/flight-search-backend backend=flight-search/backend:v1.2.0 -n flight-search-prod
   kubectl rollout status deployment/flight-search-backend -n flight-search-prod --timeout=600s
   ```

3. **Run Database Migrations** (if needed)
   ```bash
   kubectl run migration-job --image=flight-search/backend:v1.2.0 --rm -it --restart=Never -n flight-search-prod -- npm run migrate
   ```

4. **Deploy Frontend**
   ```bash
   kubectl set image deployment/flight-search-frontend frontend=flight-search/frontend:v1.2.0 -n flight-search-prod
   kubectl rollout status deployment/flight-search-frontend -n flight-search-prod --timeout=300s
   ```

5. **Verify Deployment**
   ```bash
   # Health checks
   curl -f https://api.flightsearch.com/api/health
   curl -f https://flightsearch.com/health
   
   # Smoke tests
   kubectl run smoke-test --image=flight-search/test-runner:latest --rm -it --restart=Never -n flight-search-prod -- npm run smoke-test
   ```

**Rollback Procedure:**
```bash
# Rollback backend
kubectl rollout undo deployment/flight-search-backend -n flight-search-prod

# Rollback frontend
kubectl rollout undo deployment/flight-search-frontend -n flight-search-prod

# Verify rollback
kubectl rollout status deployment/flight-search-backend -n flight-search-prod
kubectl rollout status deployment/flight-search-frontend -n flight-search-prod
```

### 🔧 Infrastructure Updates

**Kubernetes Cluster Updates:**
1. **Prepare for Update**
   ```bash
   # Backup etcd
   kubectl get all --all-namespaces -o yaml > cluster-backup-$(date +%Y%m%d).yaml
   
   # Check node readiness
   kubectl get nodes
   ```

2. **Update Nodes** (one at a time)
   ```bash
   # Drain node
   kubectl drain <node-name> --ignore-daemonsets --delete-emptydir-data
   
   # Update node (method depends on your cluster setup)
   # For managed clusters, this is usually automatic
   
   # Uncordon node
   kubectl uncordon <node-name>
   ```

3. **Verify Update**
   ```bash
   kubectl get nodes -o wide
   kubectl get pods -n flight-search-prod
   ```

## Monitoring and Alerting

### 📊 Key Metrics Dashboard

**Access Grafana:**
```bash
kubectl port-forward -n flight-search-prod svc/grafana 3000:3000
# Navigate to http://localhost:3000
```

**Critical Dashboards:**
1. **System Overview**: Overall system health and performance
2. **Application Metrics**: Request rates, response times, error rates
3. **Infrastructure**: CPU, memory, disk, network usage
4. **Database Performance**: Query performance, connection pools
5. **Business Metrics**: User activity, booking rates, revenue

### 🔔 Alert Response

**Alert Severity Levels:**
- **Critical**: Immediate response required (5 minutes)
- **Warning**: Response within 30 minutes
- **Info**: Review during business hours

**Alert Response Matrix:**

| Alert | Severity | Response Time | Action |
|-------|----------|---------------|---------|
| System Down | Critical | 5 min | Execute disaster recovery |
| High Error Rate | Critical | 5 min | Scale resources, investigate |
| Database Down | Critical | 5 min | Restart database, restore if needed |
| High Response Time | Warning | 30 min | Scale application, optimize queries |
| High CPU Usage | Warning | 30 min | Scale resources, investigate |
| Backup Failed | Warning | 30 min | Retry backup, investigate |
| Certificate Expiring | Info | 24 hours | Renew certificate |

### 📈 Performance Optimization

**Regular Optimization Tasks:**
1. **Database Query Optimization**
   ```bash
   # Identify slow queries
   kubectl exec deployment/postgres -n flight-search-prod -- psql -U $POSTGRES_USER -d flight_search_prod -c "SELECT query, mean_time, calls FROM pg_stat_statements ORDER BY mean_time DESC LIMIT 10;"
   
   # Check index usage
   kubectl exec deployment/postgres -n flight-search-prod -- psql -U $POSTGRES_USER -d flight_search_prod -c "SELECT schemaname, tablename, attname, n_distinct, correlation FROM pg_stats WHERE schemaname = 'public';"
   ```

2. **Cache Optimization**
   ```bash
   # Check Redis memory usage
   kubectl exec deployment/redis -n flight-search-prod -- redis-cli info memory
   
   # Check cache hit rate
   kubectl exec deployment/redis -n flight-search-prod -- redis-cli info stats | grep keyspace
   ```

3. **Application Performance**
   - Review APM traces in Kibana
   - Identify bottlenecks in code
   - Optimize API endpoints

## Security Procedures

### 🔒 Security Incident Response

**Immediate Actions:**
1. **Isolate Affected Systems**
   ```bash
   # Scale down affected deployments
   kubectl scale deployment <affected-deployment> --replicas=0 -n flight-search-prod
   
   # Block suspicious traffic at ingress level
   kubectl patch ingress flight-search-ingress -n flight-search-prod --patch='{"metadata":{"annotations":{"nginx.ingress.kubernetes.io/whitelist-source-range":"10.0.0.0/8"}}}'
   ```

2. **Preserve Evidence**
   ```bash
   # Capture logs
   kubectl logs deployment/flight-search-backend -n flight-search-prod > incident-logs-$(date +%Y%m%d-%H%M%S).log
   
   # Capture system state
   kubectl get all -n flight-search-prod -o yaml > incident-state-$(date +%Y%m%d-%H%M%S).yaml
   ```

3. **Notify Security Team**
   - Send alert to security@flightsearch.com
   - Update incident tracking system
   - Prepare incident report

### 🔐 Regular Security Tasks

**Weekly Security Checks:**
1. **Vulnerability Scanning**
   ```bash
   # Scan container images
   docker scan flight-search/backend:latest
   docker scan flight-search/frontend:latest
   ```

2. **Access Review**
   ```bash
   # Review RBAC permissions
   kubectl get rolebindings -n flight-search-prod
   kubectl get clusterrolebindings | grep flight-search
   ```

3. **Secret Audit**
   ```bash
   # Check secret usage
   kubectl get secrets -n flight-search-prod
   kubectl describe secret flight-search-secrets -n flight-search-prod
   ```

## Backup and Recovery

### 💾 Backup Procedures

**Manual Backup:**
```bash
# Trigger manual PostgreSQL backup
kubectl create job --from=cronjob/postgres-backup manual-backup-$(date +%s) -n flight-search-prod

# Trigger manual Redis backup
kubectl create job --from=cronjob/redis-backup manual-redis-backup-$(date +%s) -n flight-search-prod

# Verify backup completion
kubectl get jobs -n flight-search-prod
aws s3 ls s3://flight-search-backups/postgres-backups/ | tail -5
```

**Backup Verification:**
```bash
# Test backup integrity
aws s3 cp s3://flight-search-backups/postgres-backups/latest-backup.sql.gz /tmp/
gunzip /tmp/latest-backup.sql.gz
head -20 /tmp/latest-backup.sql
```

### 🔄 Recovery Procedures

**Database Recovery:**
```bash
# List available backups
aws s3 ls s3://flight-search-backups/postgres-backups/

# Execute recovery
cd /opt/disaster-recovery
./restore-postgres.sh flight_search_backup_20240101_020000.sql.gz
```

**Application Recovery:**
```bash
# Scale down applications
kubectl scale deployment flight-search-backend --replicas=0 -n flight-search-prod

# Restore database
./restore-postgres.sh <backup-file>

# Scale up applications
kubectl scale deployment flight-search-backend --replicas=3 -n flight-search-prod

# Verify recovery
curl -f https://api.flightsearch.com/api/health
```

## Contact Information

### 📞 Emergency Contacts

- **On-Call Engineer**: +1-XXX-XXX-XXXX
- **DevOps Team Lead**: devops-lead@flightsearch.com
- **Security Team**: security@flightsearch.com
- **Database Administrator**: dba@flightsearch.com

### 🔗 Important Links

- **Status Page**: https://status.flightsearch.com
- **Grafana**: https://monitoring.flightsearch.com/grafana
- **Kibana**: https://monitoring.flightsearch.com/kibana
- **Incident Management**: https://flightsearch.pagerduty.com
- **Documentation**: https://docs.flightsearch.com

### 📋 Escalation Matrix

1. **Level 1**: Application issues, performance problems
   - Response: On-call engineer
   - Escalation: 30 minutes

2. **Level 2**: Infrastructure issues, database problems
   - Response: DevOps team lead
   - Escalation: 15 minutes

3. **Level 3**: Security incidents, complete outages
   - Response: Engineering manager + Security team
   - Escalation: Immediate

## Appendix

### 🛠️ Useful Commands Reference

```bash
# Quick system overview
kubectl get all -n flight-search-prod

# Resource usage
kubectl top pods -n flight-search-prod
kubectl top nodes

# Logs
kubectl logs -f deployment/flight-search-backend -n flight-search-prod
kubectl logs --previous deployment/flight-search-backend -n flight-search-prod

# Debugging
kubectl describe pod <pod-name> -n flight-search-prod
kubectl exec -it deployment/flight-search-backend -n flight-search-prod -- /bin/bash

# Scaling
kubectl scale deployment flight-search-backend --replicas=5 -n flight-search-prod

# Rolling updates
kubectl rollout restart deployment/flight-search-backend -n flight-search-prod
kubectl rollout status deployment/flight-search-backend -n flight-search-prod
kubectl rollout undo deployment/flight-search-backend -n flight-search-prod

# Port forwarding
kubectl port-forward svc/grafana 3000:3000 -n flight-search-prod
kubectl port-forward svc/prometheus 9090:9090 -n flight-search-prod
```

### 📊 Performance Baselines

**Normal Operating Parameters:**
- **Response Time**: < 500ms (95th percentile)
- **Error Rate**: < 0.1%
- **CPU Usage**: < 70% average
- **Memory Usage**: < 80% average
- **Database Connections**: < 80% of max
- **Cache Hit Rate**: > 90%

**Alert Thresholds:**
- **Critical**: Response time > 5s, Error rate > 5%, System down
- **Warning**: Response time > 2s, Error rate > 1%, High resource usage
- **Info**: Deployment events, Backup completion, Certificate expiration