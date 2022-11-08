import { DynamoDBClient, DeleteItemCommand } from '@aws-sdk/client-dynamodb'
const REGION = "eu-west-1"
const ddbClient = new DynamoDBClient({ region: REGION })
import _sodium from 'libsodium-wrappers'
import { resource } from './read.mjs'

export default async (event, context) => {
        const challengeId = event.pathParameters.challengeId
        if (!challengeId) {
            // delete called on collection
            // can only occur if API Gateway configuration is faulty
            return {'statusCode': 405}
        }
        if (!event.body) {
            return {'statusCode': 400}
        }
        let plaintext
        try {
            plaintext = JSON.parse(event.body).plaintext
        } catch (err) {
            plaintext = event.body.plaintext
        }
        if (!plaintext) {
            return {'statusCode': 400,
                    'body' : JSON.stringify({
                        // we should put a type property in with URI value according to RFC 7807
                        'title': 'missing plaintext',
                        'status': 400
                    })}
        }
        const data = await resource(challengeId)
        if (data) {
            if (data.message != plaintext) {
                return {
                    'statusCode': 406,
                    'body' : JSON.stringify({
                        // we should put a type property in with URI value according to RFC 7807
                        'title': 'plaintext incorrect',
                        'status': 406,
                        'detail': `${plaintext} is not the plaintext for ciphertext ${challengeId}`
                    })
                }
            }
            const params = {
                TableName: process.env.TABLE_NAME,
                Key: {
                    ChallengeId: { N: challengeId }
                },
            }
            const res = await ddbClient.send(new DeleteItemCommand(params))
        }
        // idempotent: running the command again yields the same results
        // it also follows that deleting an item that did not occur in the database also counts as a success
        return {
                'statusCode': 204
            }
}
