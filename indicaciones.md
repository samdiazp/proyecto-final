# Proyecto Final — Opción 3

## BookSlot: plataforma de reservas con disponibilidad en tiempo real

### El producto

**BookSlot** es una plataforma de reservas de aforo limitado: clases de gimnasio, salas de coworking, mesas de restaurante, citas médicas, plazas de un curso. El usuario ve la disponibilidad en tiempo real, reserva un slot y recibe confirmación.

El reto principal del producto es **la concurrencia**: si quedan 2 plazas y entran 5 personas a reservar a la vez, exactamente 2 deben reservar y 3 deben recibir un mensaje claro de "lo sentimos, se ha agotado". Nada de overbooking.

### Funcionalidades mínimas (MVP)

Esto es lo que hay que entregar sí o sí. Es razonablemente doable en una semana.

#### Para usuarios finales
- Registro y login.
- Listado de **recursos reservables** (cada recurso tiene nombre, capacidad y un catálogo de **slots** con fecha/hora).
- **Vista de disponibilidad**: el usuario ve cuántas plazas quedan en cada slot.
- **Reserva atómica**: el usuario selecciona un slot disponible y la plaza queda confirmada (o se le rechaza si se ha agotado durante la operación).
- **Cancelación** de una reserva propia.
- **Email de confirmación** al reservar.

#### Para administradores
- Crear recursos y slots desde un endpoint admin (no hace falta UI bonita: una API o un script de seed sirve).

> No hace falta integrar pasarela de pagos en el MVP. Si la añades, mejor.

### Extensiones opcionales

Si tienes más tiempo, cualquiera de estas suma a la nota:

- **Pagos** con Stripe (modo test) o un mock que simule cobros y reembolsos atómicos junto con la reserva.
- **Email recordatorio** N horas antes del slot reservado (EventBridge Scheduler o equivalente).
- **Política de cancelación** (gratuita hasta X horas antes).
- **Auditoría** completa de cambios de estado de cada reserva.
- **Panel admin** con UI para gestionar recursos y ver reservas.
- **Bloqueo de slots** manual (mantenimiento, festivos) y notificación a afectados.
- **Histórico extendido** de reservas con búsqueda y filtros.

### Requisitos no funcionales

- **Sin overbooking** bajo concurrencia. Es la promesa central del producto.
- **Idempotencia** en la creación de reservas: reintentar una reserva no debe crear dos.
- **Backups** de reservas y datos de usuario.
- **Alta disponibilidad** razonable.

### Tu decisión: la arquitectura

Tú eliges cómo construirlo. Caminos válidos podrían ser:

- **Clásica**: EC2 + ALB + Auto Scaling, **PostgreSQL en RDS**.
- **Serverless**: API Gateway + Lambda, DynamoDB.
- **Contenedores**: ECS o EKS, RDS o DynamoDB según elección.
- **Híbrido**: API y reservas en una opción, emails y notificaciones en otra.

> El control de concurrencia es la decisión técnica más importante del proyecto. **Explica en el README** qué mecanismo usas y demuestra que funciona.

### Entregables específicos

Además de los entregables comunes (ver al final del documento):

- **Diagrama de arquitectura** con servicios y, especialmente, dónde se produce el control de concurrencia.
- **Sección "Decisión arquitectónica"** en el README justificando tu stack y, en concreto, **cómo evitas overbooking**.
- **Prueba de concurrencia**: script (puede ser un loop sencillo o `xargs -P` lanzando curls) que dispare N reservas simultáneas sobre un slot con M plazas (N > M) y demostrar que se confirman exactamente M y se rechazan N − M. Adjuntar el script y la salida.

---

## Requisitos comunes a todos los proyectos

> Aplican igual a las opciones 1, 2, 3 y libre. Son la base mínima para aprobar.

### Repositorio y documentación
- **Repositorio Git público** con historial de commits coherente.
- **README** con: descripción funcional, diagrama, **sección de decisión arquitectónica**, instrucciones reproducibles de despliegue, estimación de coste mensual e instrucciones de destrucción.

### Plataforma e IaC
- Todo desplegado sobre **AWS** o sobre **Kubernetes**.
- Infraestructura definida en **Terraform**, salvo el bootstrap mínimo (cuenta, usuario IAM inicial, bucket de tfstate).
- **Backups automáticos** de cualquier almacén de datos persistente.
- **Alta disponibilidad** razonable.

### CI/CD
- Pipeline funcional (**GitHub Actions**, **AWS CodePipeline** o equivalente) que despliegue la aplicación al hacer push a `main`.

### Seguridad
- **IAM con mínimo privilegio**.
- **Secretos fuera del código** (Secrets Manager, SSM Parameter Store, o Secrets de Kubernetes).
- **HTTPS** en el tráfico expuesto a internet.

### Observabilidad mínima
- **Logs centralizados** (CloudWatch o equivalente).
- Al menos **una alarma activa** que notifique a un email o canal.

### FinOps
- **Etiquetado** de recursos con `Project`, `Environment`, `Owner`.
- **AWS Budgets** configurado con presupuesto y alarma de coste.
