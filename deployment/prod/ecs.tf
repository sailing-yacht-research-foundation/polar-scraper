resource "aws_cloudwatch_log_group" "polar_scraper_cw_log_group" {
  name = "PolarScraper-log"

  retention_in_days = 7

  lifecycle {
    create_before_destroy = true
    prevent_destroy       = false
  }
}

resource "aws_ecs_task_definition" "polar_scraper_task" {
  family                   = "polar-scraper-task"
  container_definitions    = <<DEFINITION
  [
    {
      "name": "${var.task_name}",
      "image": "${aws_ecr_repository.polar_scraper_ecr.repository_url}",
      "command": ["node", "build/index.js"],
      "essential": true,
      "environmentFiles": [
               {
                   "value": "arn:aws:s3:::syrf-prod-env-variables/polar-scraper.env",
                   "type": "s3"
               }
           ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "${aws_cloudwatch_log_group.polar_scraper_cw_log_group.id}",
          "awslogs-region": "${var.aws_region}",
          "awslogs-stream-prefix": "ecs"
        }
      },
      "memory": 1024,
      "cpu": 512
    }
  ]
  DEFINITION
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  memory                   = 1024
  cpu                      = 512
  execution_role_arn       = var.iam_ecsTaskExecution_role
}

resource "aws_cloudwatch_event_rule" "everyday_rule" {
  name                = "polar-scraper-daily"
  description         = "Runs the polar scraper daily at 00:30 UTC"
  schedule_expression = "cron(30 00 * * ? *)"
  is_enabled          = true
}

resource "aws_cloudwatch_event_target" "polar_scraper_scheduled_task" {
  rule       = aws_cloudwatch_event_rule.everyday_rule.name
  target_id  = var.task_name
  arn        = var.scraper_runner_arn
  role_arn   = aws_iam_role.polar_scraper_prod_role.arn

  ecs_target {
    launch_type         = "FARGATE"
    platform_version    = "LATEST"
    task_count          = 1
    task_definition_arn = aws_ecs_task_definition.polar_scraper_task.arn

    network_configuration {
      subnets = ["subnet-028dcac02c2daa0ff"]
    }
  }

}

resource "aws_iam_role" "polar_scraper_prod_role" {
  name = "polar_scraper_prod_iam"

  assume_role_policy = <<DOC
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "",
      "Effect": "Allow",
      "Principal": {
        "Service": "events.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
DOC
}

resource "aws_iam_role_policy" "polar_scraper_role_policy" {
  name = "polar_scraper_role_policy"
  role = aws_iam_role.polar_scraper_prod_role.id

  policy = <<DOC
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": "iam:PassRole",
            "Resource": "*"
        },
        {
            "Effect": "Allow",
            "Action": "ecs:RunTask",
            "Resource": "${replace(aws_ecs_task_definition.polar_scraper_task.arn, "/:\\d+$/", ":*")}"
        }
    ]
}
DOC
}