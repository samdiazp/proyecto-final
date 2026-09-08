resource "aws_secretsmanager_secret" "jwt_secret" {
  name = "${var.project_name}-${var.environment}-jwt-secret"
}