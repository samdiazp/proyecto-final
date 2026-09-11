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
- CloudWatch ()

Se puede ver la estructura de DynamoDB en el archivo `table.md`

Tambien hay una imagen para poder ver el flujo de la arquitectura utilizada en `services-arquitecture.png`


Toda esta implementado como IaC en la carpeta de terraform, cada servicio cuenta con los privilegios minimos asociados.

Tambien se ha implementando CI/CD usando GitHub actions con los permisos necesarios a 
traves de OIDC.

## Concurrency 

Uno de los principales problemas a resolver en el sistema de reservas es evitar que varios usuarios puedan reservar simultáneamente más espacios de los disponibles.

No se utiliza un flujo basado en consultar espacios disponibles, comprobar cantidad y crear reserva

ya que dos o más solicitudes concurrentes podrían leer el mismo valor antes de que alguna de ellas actualice el recurso, produciendo un problema de concurrencia y permitiendo overbooking.

Para evitarlo, cada recurso mantiene un atributo `availableSpots` y la creación de una reserva se realiza utilizando `TransactWriteItems` de `DynamoDB`.


## Asincronia  

Al hacer una reserva asociada a un recurso, esta crea un schedule event en EventBridge que a se dispara una hora antes de la hora de inicio del recurso. Este evento se envia a SQS que a su vez hace un dispatch de una lambda y esta procesa la informacion y hace una nueva insercion a Dynamo. Una implementacion en produccion seria usar un servicio como SES.


## Decisiones

Esta arquitectura me permite tener componentes desacoplados que se encargan de su funcion especifica. diciendo esto para simplicidad del proyecto utilice TRPC para tener un punto de de entrada y que se pudiera comunicar facilmente con la App del frontend. y tambien una decision personal por querer implementar toda una arquitectura serverless

Se evaluó una solución basada en WebSockets para actualizaciones en tiempo real. Sin embargo, para mantener la simplicidad del alcance del proyecto se optó por polling periódico. En una evolución del sistema, API Gateway WebSocket permitiría mantener la arquitectura serverless sin necesidad de desplegar un servicio persistente.

## Idempotencia de reservas

Cada petición `createReservation` incluye una `idempotencyKey` generada por el cliente. La API guarda esa clave, el recurso, las plazas y el `reservationId` dentro del mismo `TransactWriteItems` que reduce `availableSpots` y crea la reserva.

Si el cliente reintenta la misma petición con la misma clave, DynamoDB devuelve la reserva ya creada en lugar de descontar otra plaza. Si la clave se reutiliza para otro recurso o número de plazas, la API responde con conflicto. La clave se conserva en la interfaz después de un error de red para poder reintentar de forma segura.

## Prueba de concurrencia

El script `scripts/test-concurrency.sh` crea un recurso nuevo con `M` plazas, registra `N` usuarios distintos y lanza las `N` reservas en paralelo. Debe cumplirse `N > M`; el script termina con error si no se confirman exactamente `M` reservas.

Requiere `curl`, `jq`, un endpoint tRPC y un token de usuario para crear el recurso:

```bash
export TRPC_URL="https://j1ukdy246f.execute-api.us-east-1.amazonaws.com/prod/api/trpc"
export ADMIN_TOKEN="JWT_DEL_USUARIO"
CAPACITY=2 REQUESTS=5 bash scripts/test-concurrency.sh
```

SALIDA:
```
CAPACITY=2 REQUESTS=5 bash scripts/test-concurrency.sh
Creating resource with 2 places...
Unable to create resource: {"result":{"data":{"resource":{"resourceId":"8931e971-0d8d-4e01-a319-b0a1594305ef","name":"Concurrency test 1789093834-27020","spots":2,"availableSpots":2,"reservationDate":"2026-09-11T04:30:34Z","description":"Automated concurrency test","createdAt":"2026-09-11T02:30:34.384Z"}}}}
```

FRONTEND_URL="https://d31pdf9rbnh4s1.cloudfront.net"
