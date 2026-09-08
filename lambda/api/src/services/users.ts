import { get, put, query } from '../db'
import { randomUUID } from 'crypto'
import bcryptjs from 'bcryptjs'
import { TRPCError } from '@trpc/server'

type User = {
    fullname: string
    email: string
}

type UserWithPwd = User & {
    pwd: string
}

export const getUserById = async (userId: string) => {
    const params = {
        Key: {
            PK: `USER#${userId}`,
            SK: "META"
        }
    }

    const result = await get(params)
    return result
}

export const getUserByEmail = async (email: string) => {
    const queryParams = {
        IndexName: "GSI1",
        KeyConditionExpression: "GSI1PK = :email",
        ExpressionAttributeValues: {
            ":email": `EMAIL#${email}`,
        },
        Limit: 1
    }

    const result = await query(queryParams)
    return result ?? []
}


export const registerUser = async (userData: UserWithPwd) => {
    const existingUser = await getUserByEmail(userData.email)
    if (existingUser && existingUser.length > 0) {
        throw new TRPCError({
            code: "BAD_REQUEST",
            message: "User with this email already exists"
        })
    }

    const userId = randomUUID()
    const hashedPwd = await bcryptjs.hash(userData.pwd, 12)
    const params = { 
        Item: {
            PK: `USER#${userId}`,
            SK: "META",
            fullname: userData.fullname,
            email: userData.email,
            createdAt: new Date().toISOString(),
            GSI1PK: `EMAIL#${userData.email}`,
            GSI1SK: `USER#${userId}`,
            entity: "USER",
            hashedPwd: hashedPwd
        }
    }

    await put(params)
    return {
        userId,
        fullname: userData.fullname,
        email: userData.email,
        createdAt: params.Item.createdAt
    }
}