import _sodium from 'libsodium-wrappers'
import {DeleteItemCommand, UpdateItemCommand} from '@aws-sdk/client-dynamodb'
import {resource, marshall} from './read.js'
const REGION = process.env.REGION
const tableName = process.env.TABLE_NAME

function concat(...arrays) {
    return arrays.reduce((acc, arr) => new Uint8Array([...acc, ...arr]), [])
}

async function deleteFromDB(ddbClient, challengeId) {
    try {
        const params = {
            TableName: tableName,
            Key: {
                ChallengeId: {N: challengeId}
            }
        }
        const deleteItemCmd = new DeleteItemCommand(params)
        console.debug(`deleting ${deleteItemCmd.input.Key.ChallengeId.N} from ${deleteItemCmd.input.TableName}`)
        const res = await ddbClient.send(deleteItemCmd)
        const statusCode = res.$metadata.httpStatusCode
        if (statusCode != 200) {
            throw new Error('DeleteItem failed with HTTP statuscode ' + statusCode)
        } 
    } catch(err) {
        console.error(`cannot retrieve challenge ${challengeId}: `, err)
        throw err
    }
}

function badRequest(errorMessage) {
    return {
        'statusCode': 400,
        'headers': {'Content-Type': 'application/json'},
        'body': JSON.stringify({
            'errorMessage': errorMessage
        })
    }
}

export default async (ddbClient, event, context) => {
    console.debug(`event.body is ${event.body}`)
    if (!event.body || !JSON.parse(event.body).prefix) return badRequest('no prefix')
   // if (!event.body) return badRequest('no prefix')
    let prefix = JSON.parse(event.body).prefix
   // if (!prefix)  return badRequest('no prefix')
    try {
        prefix = _sodium.from_base64(prefix, _sodium.base64_variants.ORIGINAL)
    } catch (err) {
        return badRequest(`prefix is not base64 (original) encoded`)
    }
    const itemToDelete = await resource(ddbClient, event.pathParameters.challengeId)
    if (itemToDelete) {
        const marshalledItemToDelete = marshall(itemToDelete)
        const challengeId = marshalledItemToDelete.challengeId 
        const hash = _sodium.crypto_generichash( _sodium.crypto_generichash_BYTES, concat(prefix, itemToDelete.message.B))
        if (hash[0] !== 0 || hash[1] !== 0){
            console.debug('not solved')
            const updateParams = {
                TableName: tableName,
                Key: {"ChallengeId": {"N": `${challengeId}`}},
                ReturnValues: "UPDATED_NEW",
                UpdateExpression: "SET attemptsRemaining = attemptsRemaining - :c",
                ExpressionAttributeValues: {
                    ":c": {"N": "1"}
                }
            }
            const ddbRes = await ddbClient.send(new UpdateItemCommand(updateParams))
            const statusCode = ddbRes.$metadata.httpStatusCode
            if (statusCode != 200) {
                throw new Error('UpdateItem failed with HTTP statuscode ' + statusCode)
            }
            const attemptsRemaining = ddbRes.Attributes.attemptsRemaining.N
            if (attemptsRemaining <= 0){
                deleteFromDB(ddbClient, challengeId)
                return badRequest(`the hash does not have 2 leading zeroes. Last attempt - removing challenge`)
            }
            return badRequest(`the hash does not have 2 leading zeroes: ${_sodium.to_base64(hash, _sodium.base64_variants.ORIGINAL)}`)
        }
        await deleteFromDB(ddbClient, challengeId)
        return {
            'statusCode': 200,
            'body': JSON.stringify({
                message: marshalledItemToDelete.message,
                hash: _sodium.to_base64(hash, _sodium.base64_variants.ORIGINAL)
            })
        }
    } else {
        return {
            'statusCode': 404,
        }
    }
}