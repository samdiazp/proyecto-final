# Proyecto Final.

Este es mi app de book slot para el proyecto final de la certificacion de AWS y Cloud.

HE tomado la decision de irme por la opcion #3 de las recomendadas y manejar una estructura serverless. En la cual estoy haciendo uso de los siguientes servicios 
de AWS:

- Lambda
- DynamoDB
- CloudFront
- S3
- EventBridge Scheduler
- SQS
- IAM
- API Gateway

Se puede ver la estructura de DynamoDB en el archivo `table.md`

Tambien hay una imagen para poder ver el flujo de la arquitectura utilizada en `services-arquitecture.png`


Toda esta implementado como IaC en la carpeta de terraform, cada servicio cuenta con los privilegios minimos asociados.

Tambien se ha implementando CI/CD usando GitHub actions con los permisos necesarios a 
traves de OIDC. 

Esta arquitectura me permite tener componentes desacoplados que se encargan de su funcion especifica. diciendo esto para simplicidad del proyecto utilice TRPC para tener un punto de de entrada y que se pudiera comunicar facilmente con la App del frontend. y tambien una decision personal por querer implementar toda una arquitectura serverless

Se evaluó una solución basada en WebSockets para actualizaciones en tiempo real. Sin embargo, para mantener la simplicidad del alcance del proyecto se optó por polling periódico. En una evolución del sistema, API Gateway WebSocket permitiría mantener la arquitectura serverless sin necesidad de desplegar un servicio persistente.

