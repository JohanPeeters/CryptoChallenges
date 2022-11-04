import _sodium from 'libsodium-wrappers'
import {GetItemCommand} from '@aws-sdk/client-dynamodb'

export default async (ddbClient, event, context) => {
    try {
        await _sodium.ready
    } catch (err) {
        console.error('libsodium does not load: ', err)
        throw new Error('libsodium does not load: ', err)
    }
    const challengeId = event.pathParameters.challengeId
    if (challengeId) {
        try {
            const data = await resource(ddbClient, challengeId)
            if (data) {
                return {
                        'statusCode': 200,
                        'headers': {
                            'Content-Type': 'application/json'
                        },
                        'body': JSON.stringify(marshall(data))
                    }
            }
        } catch(err) {
            console.error(`cannot retrieve challenge ${challengeId}: `, err)
            throw err
        }
    }
    return {
        'statusCode': 404,
    }
}

export async function resource(ddbClient, challengeId) {
    const tableName = process.env.TABLE_NAME
    const params = {
        TableName: tableName,
        Key: {
            ChallengeId: {N: challengeId}
        }
    }
    const getItemCmd = new GetItemCommand(params)
    const data = await ddbClient.send(getItemCmd)
    const statusCode = data.$metadata.httpStatusCode
    if (statusCode != 200) {
        throw new Error('GetItem failed with HTTP statuscode ' + statusCode)
    }
    const item = data.Item
    return item
}

export function marshall(resource) {
    return {
        challengeId: resource.ChallengeId.N,
        message: _sodium.to_base64(resource.message.B, _sodium.base64_variants.ORIGINAL),
        attemptsRemaining: resource.attemptsRemaining.N
    }
}