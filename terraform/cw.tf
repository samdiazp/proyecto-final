resource "aws_cloudwatch_log_group" "api_gw" {
  name              = "/aws/api-gateway/${var.project_name}-${var.environment}-api"
  retention_in_days = 14
}