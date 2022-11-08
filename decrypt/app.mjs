import postResponse from './create.mjs'
import {getResponse} from './read.mjs'
import deleteResponse from './delete.mjs'


export async function lambdaHandler(event, context) {
    console.log('handler invoked')
    let response = {}
    try {
        if (event.httpMethod == 'POST') {
            response = await postResponse(event, context)
        } else if (event.httpMethod == 'GET') {
            response = await getResponse(event, context)
        } else if (event.httpMethod == 'DELETE') {
            response = await deleteResponse(event, context)
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

    return response
}