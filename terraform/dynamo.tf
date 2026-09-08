resource "aws_dynamodb_table" "api_table" {
  name           = "${var.project_name}-${var.environment}-api-table"
  billing_mode   = "PAY_PER_REQUEST"

  hash_key       = "PK"
  range_key      = "SK"

  attribute {
    name = "PK"
    type = "S"
  }

  attribute {
    name = "SK"
    type = "S"
  }
}  