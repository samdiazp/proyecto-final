output "trpc_url" {
  description = "Public tRPC endpoint, including the API Gateway stage."
  value       = "${aws_apigatewayv2_api.api.api_endpoint}/${aws_apigatewayv2_stage.api_stage.name}/api/trpc"
}

output "frontend_url" {
  description = "Public frontend URL, including the CloudFront distribution domain name."
  value       = "https://${aws_cloudfront_distribution.frontend.domain_name}"
}

output "frontend_bucket_name" {
  description = "Name of the S3 bucket used for frontend hosting."
  value       = aws_s3_bucket.frontend.bucket
}

output "cloudfront_distribution_id" {
  description = "ID of the CloudFront distribution for the frontend."
  value       = aws_cloudfront_distribution.frontend.id
}