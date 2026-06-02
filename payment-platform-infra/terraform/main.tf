terraform {
  required_version = ">= 1.5.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

# 1. KMS Encryption Key (PCI-DSS compliant secrets encryption)
resource "aws_kms_key" "payment_kms_key" {
  description             = "KMS Key for encrypting merchant gateway credentials"
  deletion_window_in_days = 30
  enable_key_rotation     = true

  tags = {
    Environment = var.environment
    Service     = "PaymentOrchestrator"
  }
}

# 2. VPC & Networking (Isolated private subnets for RDS & MSK)
module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "~> 5.0"

  name = "payment-platform-vpc"
  cidr = "10.0.0.0/16"

  azs             = ["${var.aws_region}a", "${var.aws_region}b"]
  private_subnets = ["10.0.1.0/24", "10.0.2.0/24"]
  public_subnets  = ["10.0.101.0/24", "10.0.102.0/24"]

  enable_nat_gateway = true
  single_nat_gateway = true

  tags = {
    Environment = var.environment
  }
}

# 3. Amazon S3 Bucket (Invoice PDF Storage)
resource "aws_s3_bucket" "invoice_bucket" {
  bucket        = "payment-platform-invoices-${var.environment}-${var.aws_region}"
  force_destroy = true
}

resource "aws_s3_bucket_public_access_block" "invoice_bucket_block" {
  bucket = aws_s3_bucket.invoice_bucket.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# 4. Amazon RDS PostgreSQL Database Instance
resource "aws_db_instance" "postgres" {
  identifier             = "payment-orchestrator-db"
  allocated_storage      = 20
  max_allocated_storage  = 100
  engine                 = "postgres"
  engine_version         = "16.1"
  instance_class         = "db.t4g.micro"
  db_name                = "payment_platform"
  username               = "db_admin"
  password               = var.db_password
  db_subnet_group_name   = module.vpc.database_subnet_group_name
  vpc_security_group_ids = [aws_security_group.db_sg.id]
  skip_final_snapshot    = true
}

resource "aws_security_group" "db_sg" {
  name        = "payment-db-sg"
  description = "Allow inbound PostgreSQL traffic from private subnets"
  vpc_id      = module.vpc.vpc_id

  ingress {
    from_port   = 5432
    to_port     = 5432
    protocol    = "tcp"
    cidr_blocks = module.vpc.private_subnets_cidr_blocks
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/24"]
  }
}

# 5. Amazon MSK (Kafka) Cluster for Event-Driven Services
resource "aws_msk_cluster" "kafka" {
  cluster_name           = "payment-platform-kafka"
  kafka_version          = "3.4.0"
  number_of_broker_nodes = 2

  broker_node_group_info {
    instance_type = "kafka.m5.large"
    client_subnets = module.vpc.private_subnets
    security_groups = [aws_security_group.kafka_sg.id]
  }

  encryption_info {
    encryption_in_transit {
      client_broker = "TLS_PLAINTEXT"
    }
  }

  tags = {
    Environment = var.environment
  }
}

resource "aws_security_group" "kafka_sg" {
  name        = "payment-kafka-sg"
  description = "Allow MSK communication inside VPC"
  vpc_id      = module.vpc.vpc_id

  ingress {
    from_port   = 9092
    to_port     = 9094
    protocol    = "tcp"
    cidr_blocks = module.vpc.private_subnets_cidr_blocks
  }
}

# 6. ECS Cluster & ECS Fargate Service (Express Modular Monolith Core)
resource "aws_ecs_cluster" "payment_cluster" {
  name = "payment-orchestrator-cluster"
}

resource "aws_ecs_task_definition" "core_task" {
  family                   = "payment-core-task"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = "256"
  memory                   = "512"

  container_definitions = jsonencode([
    {
      name      = "payment-core"
      image     = "${var.ecr_repo_url}:latest"
      essential = true
      portMappings = [
        {
          containerPort = 3001
          hostPort      = 3001
        }
      ]
      environment = [
        { name = "DATABASE_URL", value = "postgresql://${aws_db_instance.postgres.username}:${var.db_password}@${aws_db_instance.postgres.endpoint}/${aws_db_instance.postgres.db_name}" },
        { name = "KAFKA_BROKERS", value = join(",", aws_msk_cluster.kafka.bootstrap_brokers) }
      ]
    }
  ])
}

resource "aws_ecs_service" "core_service" {
  name            = "payment-core-service"
  cluster         = aws_ecs_cluster.payment_cluster.id
  task_definition = aws_ecs_task_definition.core_task.arn
  desired_count   = 2
  launch_type     = "FARGATE"

  network_configuration {
    subnets         = module.vpc.private_subnets
    security_groups = [aws_security_group.ecs_sg.id]
  }
}

resource "aws_security_group" "ecs_sg" {
  name   = "payment-ecs-sg"
  vpc_id = module.vpc.vpc_id

  ingress {
    from_port   = 3001
    to_port     = 3001
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}
