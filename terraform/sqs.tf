resource "aws_sqs_queue" "reminder_queue" {
  name                       = "${var.project_name}-${var.environment}-reminders"
  visibility_timeout_seconds = 30
  message_retention_seconds  = 86400

  tags = {
    Service   = "Reminders"
  }
}

resource "aws_lambda_event_source_mapping" "email_queue_trigger" {
  event_source_arn = aws_sqs_queue.reminder_queue.arn
  function_name    = aws_lambda_function.email_lambda.arn

  batch_size       = 10
}