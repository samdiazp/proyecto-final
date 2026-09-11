# Tabla primaria dynamo
---

## Consultas a realizar

Crear un usuario
Obtener un usuario por ID
Crear un recurso
Obtener todos los recursos ASC/DESC
Obtener un recurso por ID
Crear reserva
Obtener reserva por ID
Obtener todas las reservas de un usuario
Obtener todas las reservas de un recurso


## Llaves de acceso y sorting

PK
SK
GSI1PK
GSI1SK
GSI2PK
GSI2SK


## Usuarios

PK: USER#$ID S
SK: META S
fullname: $NAME S
entity: USER
email: $EMAIL S
hashedPwd: $HASHED S
createdAt: $DATE S
GSI1PK: EMAIL#$EMAIL S
GSISK: USER#$ID S

## Recursos
PK: RESOURCE#$ID S
SK: META S
name: $NAME S
entity: RESOURCE S 
spots:  $SPOTS N
availableSpots $AVAILABLE N
description $DESCRIPTION S
createdAt: $DATE S
GSI1PK: RESOURCE S
GSI1SK: CREATED#$DATE#$ID S

## Reservas
PK: RESERVATION#$ID S
SK: META S
entity: RESERVATION S
GSI1PK: USER#$ID S
GSI1SK: DATE#$DATE#$ID S
GSI2PK: RESOURCE#$ID S
GSI2SK: DATE#$DATE#$ID S
reservationDate: $DATE S
createdAt: $DATE S
status: $STATUS S
userName: $USERNAME S
userId: $USERID S
resourceId: $RESOURCEID S
resourceName: $RESOURCENAME S
spots: $SPOTS N

## Idempotencia de reservas
PK: USER#$ID S
SK: IDEMPOTENCY#$KEY S
entity: IDEMPOTENCY S
reservationId: $ID S
resourceId: $RESOURCEID S
spots: $SPOTS N
createdAt: $DATE S

## Reminders
SK: RESERVATION:#$ID S
SK: NOTIFICATION#REMINDER S
entity: "NOTIFICATION" S,
type: "RESERVATION_REMINDER" S,
status: "SENT" S,
reservationId: $ID S,
email: $EMAIL S,
resourceName: $NAME S,
reservationDate: $DATE S,
sentAt: $DATE S,
