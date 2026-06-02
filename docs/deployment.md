# Production Deployment & Infrastructure Guide

This document details the configuration for deploying the Payment Orchestration Platform to production environments.

---

## 1. Cloud Infrastructure: AWS Topologies

We use Terraform to define our infrastructure as code (IaC) in AWS.

### 1.1 Core Monolith: AWS ECS Fargate
- **Reasoning**: ECS Fargate provides serverless container execution, eliminating the overhead of managing EC2 clusters.
- **Scaling Policies**: Auto-scaling triggers when average CPU or memory usage exceeds 70%.

### 1.2 Supporting Services: AWS Lambda
- **Reasoning**: Asynchronous services (Invoice, Notification, Audit, Settlement) run on event-driven cycles. Deploying them as Lambdas reduces idle costs.
- **Trigger**: Kafka (AWS MSK) topics trigger these serverless Lambdas.

### 1.3 Database & Message Queue
- **AWS RDS PostgreSQL 16**: Deployed in a multi-AZ configuration to ensure high availability and failover capability.
- **Amazon MSK (Kafka)**: A fully managed Kafka cluster with encrypted TLS access.
- **Amazon S3**: Secure bucket for PDF invoices.

---

## 2. Kubernetes Deployment

For environments running Kubernetes (EKS), manifests are located under `payment-platform-infra/kubernetes/`.

### 2.1 Pod Resource Allocation
To ensure stability, the core pods configure resource boundaries:
- **Requests**: CPU 250m, Memory 256Mi
- **Limits**: CPU 500m, Memory 512Mi

### 2.2 Health Probes
- **Readiness Probe**: Queries `/health` on port 3001. If it fails, traffic is diverted from that pod.
- **Liveness Probe**: Restarts the container if `/health` hangs.

---

## 3. CI/CD GitOps Pipeline

Deployments are automated using GitHub Actions workflows combined with GitOps.

### pipeline Execution Steps:
1. **Linting & Validation**: Runs strict formatting and type checking.
2. **Test Isolation**: Runs Jest tests.
3. **Build & Push**: Builds Docker images and pushes them to Amazon ECR.
4. **Deploy**: Triggers AWS ECS or ArgoCD to apply the updated container images.
