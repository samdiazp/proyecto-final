resource "aws_scheduler_schedule_group" "reservation_reminders" {
  name = "${var.project_name}-${var.environment}-reservation-reminders"

  tags = {
    Service   = "Reminders"
  }
}