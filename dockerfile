FROM public.ecr.aws/lambda/nodejs:14
COPY app.js create.js delete.js read.js package*.json ${LAMBDA_TASK_ROOT}/
RUN npm install
CMD [ "app.lambdaHandler" ]