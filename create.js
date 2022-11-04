import _sodium from 'libsodium-wrappers'
import {PutItemCommand} from '@aws-sdk/client-dynamodb'
import {marshall, resource} from './read.js'

export default async(ddbClient, event, context) => {
    console.debug('v0.0.4 create request received')
    try {
        await _sodium.ready
    } catch (err) {
        console.error(err)
        throw new Error('libsodium does not load: ', err)
    }
    const challengeId = `${_sodium.randombytes_random()}`
    const msg = _sodium.randombytes_buf(64)
    const tableName = process.env.TABLE_NAME
    try {
        const putParams = {
            TableName: tableName,
            Item: {
                ChallengeId: {N: challengeId},
                message: {B: msg},
                attemptsRemaining: {N: '3'},
                TTL: {N: `${Math.floor(Date.now() / 1000) + 3600}`}
            }
        }
        const ddbRes = await ddbClient.send(new PutItemCommand(putParams))
        const statusCode = ddbRes.$metadata.httpStatusCode
        if (statusCode != 200) {
            return new Error('PutItem failed with HTTP statuscode ' + statusCode)
        }
    } catch (err){
        return {
            'statusCode': 500,
            'body': JSON.stringify(err)
        }
    }
    const data = await resource(ddbClient, challengeId)
    if (data) {
        return {
                'statusCode': 201,
                'headers': {
                    'Location': `/${challengeId}`,
                    'Content-Type': 'application/json'
                },
                'body': JSON.stringify(marshall(data))
            }
    } else {
        throw new Error('cannot create challenge')
    }
}