import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, GetCommand, GetCommandInput, PutCommand, PutCommandInput, QueryCommand, QueryCommandInput, TransactWriteCommand, TransactWriteCommandInput } from '@aws-sdk/lib-dynamodb'


const dynamodbClient = new DynamoDBClient({ region: process.env.REGION })
const dynamodbDocumentClient = DynamoDBDocumentClient.from(dynamodbClient)

const get = async (params: Omit<GetCommandInput, 'TableName'>) => {
    const command = new GetCommand({
        TableName: process.env.TABLE_NAME,
        ...params
    })
    const result = await dynamodbDocumentClient.send(command)
    return result.Item
}

const query = async (params: Omit<QueryCommandInput, 'TableName'>) => {
    const command = new QueryCommand({
        TableName: process.env.TABLE_NAME,
        ...params
    })
    const result = await dynamodbDocumentClient.send(command)
    return result.Items
}

const put = async (params: Omit<PutCommandInput, 'TableName'>) => {
    const command = new PutCommand({
        TableName: process.env.TABLE_NAME,
        ...params
    })
    const result = await dynamodbDocumentClient.send(command)
    return result
}

const transactWrite = async (
    params: TransactWriteCommandInput,
) => {
    return dynamodbDocumentClient.send(
        new TransactWriteCommand(params),
    );
};

export { get, query, put, transactWrite }