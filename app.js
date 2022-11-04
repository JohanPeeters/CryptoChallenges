import _sodium from 'libsodium-wrappers'
import {DynamoDBClient} from '@aws-sdk/client-dynamodb'
import postRequest from './create.js'
import getResponse from './read.js'
import deleteResponse from './delete.js'
const REGION = process.env.REGION
const ddbClient = new DynamoDBClient({
    region: REGION
})


export async function lambdaHandler(event, context) {
    const eventStringified = JSON.stringify(event)
    console.log(`v0.0.8 received event ${eventStringified}`)
    try {
        await _sodium.ready
    } catch (err) {
        console.error(err)
        throw new Error('libsodium does not load: ', err)
    }
    const tableName = process.env.TABLE_NAME
    console.debug(`tableName is ${tableName}`)
    const body = {
        'message': 'method not yet implemented'
    }
    let response = {
        'statusCode': 200,
        'headers': {
             'Content-Type': 'application/json'
        },
        'body': body
    }
    try {
        if (event.httpMethod === 'POST') {
            console.info('creating a challenge')
            response = await postRequest(ddbClient, event, context)
        } else if (event.httpMethod === 'GET') {
            response = await getResponse(ddbClient, event, context)
        } else if (event.httpMethod === 'DELETE') {
            response = await deleteResponse(ddbClient, event, context)
        } else {
            console.warn(`method not supported: ${event.httpMethod}`)
            response = {
                'statusCode': 405,
                'error': 'method not supported'
            }
        }
    } catch (err) {
        console.error('operation fails', err)
        response = {
            'statusCode': 500,
            'body': {
                'errorMessage': err.errorMessage
            }
        }
    }
    return response;
}