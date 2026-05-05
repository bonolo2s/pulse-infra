# pulse-infra

AWS infrastructure for [Pulse](https://github.com/bonolo2s/Pulse)

---

## Why IaC
Infrastructure as Code means:
- Every change is a commit. Every commit is reviewable.
- Any environment can be torn down and reproduced exactly.

---

## Architecture Decisions

### Modular stacks over a single stack

Each AWS service lives in its own CDK stack file:

```
lib/
├── vpc-stack.ts
├── ecs-stack.ts
├── rds-stack.ts
├── elasticache-stack.ts
├── lambda-stack.ts
├── apigateway-stack.ts
├── sns-stack.ts
├── ses-stack.ts
└── observability-stack.ts
```

A single stack would be faster to write. That's not the goal.

**Blast radius** — if ElastiCache config changes, only that stack redeploys. A monolithic stack redeploys everything, risking resources that were working fine.

**Maintainability** — each stack has one responsibility. A new engineer navigating this repo can find what they need without reading 800 lines of infrastructure code.

**Scalability** — when Pulse grows, individual stacks can be extracted into separate repos or AWS accounts without a rewrite. The boundaries are already drawn.

---

### VPC design — perimeter first

Everything lives inside a VPC. Nothing is exposed by accident.

```
Public subnet  → API Gateway, Lambda (internet-facing by design)
Private subnet → RDS, ElastiCache (no internet access, ever)
```

`natGateways: 0` — NAT Gateways cost money and the private subnet resources (RDS, ElastiCache) have no reason to call the internet. Removed entirely.

`maxAzs: 2` — two availability zones. If one AWS data centre fails, the other keeps Pulse running.

---

### ECS on EC2 over Fargate

Cost optimisation at the current stage — EC2 gives full control over the underlying instance.

When traffic grows and managed scaling becomes a priority, the shift to Fargate is a single stack change. The boundary is already drawn.

---

### Lambda for health checks — not a background thread

A background thread inside the API means a slow health check blocks the API. Lambda isolates each check — stateless, independent, and scales without touching the API layer.

EventBridge triggers each Lambda on a configurable interval. Adding a new check interval requires no API changes.

---

### SNS and SES as separate stacks

They were split deliberately.

SNS is the alert bus — it decouples failure detection from notification delivery. Adding a new alert channel (Slack, webhook, PagerDuty) requires no changes to the detection logic.

SES is email delivery. Today it sends downtime alerts. Tomorrow it could send login confirmations, billing receipts, or weekly reports. Keeping it separate means it can grow without touching the alerting pipeline.

---

### No Route53

GoDaddy manages the domain. DNS points directly to API Gateway. Route53 adds $0.50/month and zero value at this scale.

Cost decisions are architecture decisions.

---

## Stack Summary

| Stack | Service | Purpose |
|---|---|---|
| VpcStack | VPC | Network perimeter — public + private subnets |
| EcsStack | ECS on EC2 (t3.micro) | Hosts the .NET 9 API container |
| RdsStack | RDS PostgreSQL | Primary database — private subnet |
| ElastiCacheStack | ElastiCache Redis | Caching layer — private subnet |
| LambdaStack | Lambda + EventBridge | Scheduled health checks |
| ApiGatewayStack | API Gateway | Routing, rate limiting, tier enforcement |
| SnsStack | SNS | Alert fan-out — decoupled from delivery |
| SesStack | SES | Email alert delivery |
| ObservabilityStack | CloudWatch + S3 | Logs, metrics, dashboards, log archives |

---

## Deployment

### Prerequisites
- AWS CLI configured (`aws configure`)
- CDK bootstrapped (`cdk bootstrap aws://ACCOUNT/REGION`)
- `.env` file with `PULSE_ALERT_EMAIL`

### Deploy all stacks
```bash
cdk deploy --all
```

### Deploy a single stack
```bash
cdk deploy PulseVpcStack
```

---

## Design Philosophy

Two questions before any decision:

1. **Will it scale?** — not prematurely, but without a rewrite when the time comes
2. **Can the next engineer maintain it?** — if not, it's already broken

Security and cost follow once the foundation holds. Not before.