import _sodium from 'libsodium-wrappers'
import { DynamoDBClient, GetItemCommand } from '@aws-sdk/client-dynamodb'
const REGION = "eu-west-1"
const ddbClient = new DynamoDBClient({ region: REGION })

export const getResponse = async (event, context) => {
        await _sodium.ready
        const challengeId = event.pathParameters.challengeId
        if (challengeId) {
            const data = await resource(challengeId)
            if (data) {
                return {
                        'statusCode': 200,
                        'headers': {
                            'Content-Type': 'application/json'
                        },
                        'body': JSON.stringify({
                            'challengeId': challengeId,
                            'key': data.key,
                            'ciphertext': data.challenge,
                            'nonce': data.nonce
                        })
                    }
            }
        }
        return {
            'statusCode': 404,
        }
}

export const resource = async (challengeId) => {
        const params = {
            TableName: process.env.TABLE_NAME,
            Key: {
                ChallengeId: { N: challengeId }
            }
        }
        const data = await ddbClient.send(new GetItemCommand(params))
        const item = data.Item
        if (item) {
            return {
                ChallengeId: challengeId,
                key: _sodium.to_base64(item.key.B, _sodium.base64_variants.ORIGINAL),
                nonce: _sodium.to_base64(item.nonce.B, _sodium.base64_variants.ORIGINAL),
                challenge: _sodium.to_base64(item.challenge.B, _sodium.base64_variants.ORIGINAL),
                message: _sodium.to_base64(item.message.B, _sodium.base64_variants.ORIGINAL)
            }
        } else {
            return undefined
        }
}