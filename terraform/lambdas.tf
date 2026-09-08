data "archive_file" "lambda_api_zip" {
    type        = "zip"
    source_dir  = "${path.module}/../lambda/api/dist"
    output_path = "${path.module}/../lambda/api/api.zip"
}


resource "aws_lambda_function" "api_lambda" {
    function_name    = "${var.project_name}-${var.environment}-api-lambda"
    handler          = "index.handler"
    runtime          = "nodejs24.x"
    role             = aws_iam_role.lambda_api_exec.arn
    filename         = data.archive_file.lambda_api_zip.output_path
    source_code_hash = data.archive_file.lambda_api_zip.output_base64sha256
    timeout          = 10

     environment {
        variables = {
            TABLE_NAME           = aws_dynamodb_table.api_table.name

            SCHEDULER_GROUP_NAME = aws_scheduler_schedule_group.reservation_reminders.name
            SCHEDULER_ROLE_ARN   = aws_iam_role.scheduler_exec.arn

            REMINDER_QUEUE_ARN   = aws_sqs_queue.reminder_queue.arn

            ENVIRONMENT          = var.environment
            SERVICE_NAME         = "api"
            REGION               = var.region
            JWT_SECRET_ARN       = aws_secretsmanager_secret.jwt_secret.arn
        }
    }

    logging_config {
        log_format            = "JSON"
        application_log_level = "INFO"
        system_log_level      = "WARN"
    }

    tracing_config {
        mode = "Active"
    }

    tags = {
        Service   = "api"
        Component = "lambda"
    }
}

data "archive_file" "lambda_email_zip" {
    type        = "zip"
    source_dir  = "${path.module}/../lambda/email"
    output_path = "${path.module}/../lambda/email/email.zip"
}

resource "aws_lambda_function" "email_lambda" {
    function_name    = "${var.project_name}-${var.environment}-email-lambda"
    handler          = "index.handler"
    runtime          = "nodejs24.x"
    role             = aws_iam_role.lambda_email_exec.arn
    filename         = data.archive_file.lambda_email_zip.output_path
    source_code_hash = data.archive_file.lambda_email_zip.output_base64sha256

    timeout          = 5

    environment {
        variables = {
            ENVIRONMENT  = var.environment
            SERVICE_NAME = "email"
        }
    }

    logging_config {
        log_format            = "JSON"
        application_log_level = "INFO"
        system_log_level      = "WARN"
    }

    tracing_config {
        mode = "Active"
    }

    tags = {
        Service   = "email"
        Component = "lambda"
    }
}