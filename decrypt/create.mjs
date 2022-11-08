import _sodium from 'libsodium-wrappers'
import { DynamoDBClient, PutItemCommand } from '@aws-sdk/client-dynamodb'
const REGION = "eu-west-1"
const ddbClient = new DynamoDBClient({ region: REGION })
import { resource } from './read.mjs'

export default async (event, context) => {
        await _sodium.ready
        const challengeId = `${_sodium.randombytes_random()}`
        const key = _sodium.crypto_secretbox_keygen()
        const message = _sodium.randombytes_buf(128)
        const nonce = _sodium.randombytes_buf(_sodium.crypto_secretbox_NONCEBYTES)
        const challenge = _sodium.crypto_secretbox_easy(message, nonce, key)
        const tableName = process.env.TABLE_NAME
        const putParams = {
            TableName: tableName,
            Item: {
                ChallengeId: { N: challengeId },
                key: { B: key },
                message: { B: message},
                nonce: { B: nonce},
                challenge: { B: challenge},
                TTL: {N: `${Math.floor(Date.now() / 1000) + 3600}`}
            }
        }
        let data
        try {
            const ddbRes = await ddbClient.send(new PutItemCommand(putParams))
            const statusCode = ddbRes.$metadata.httpStatusCode
            if (statusCode != 200) {
                throw new Error('PutItem failed with HTTP statuscode ' + statusCode)
            }
            data = await resource(challengeId)
        } catch (err){
            throw new Error('cannot store challenge: ' + err.message)
        }
        return {
                'statusCode': 201,
                'headers': {
                    'Location': `/${challengeId}`,
                    'Content-Type': 'application/json'
                },
                'body': JSON.stringify({
                    'challengeId': challengeId,
                    'key': data.key,
                    'ciphertext': data.challenge, 
                    'nonce': data.nonce,
                })
            }
}
