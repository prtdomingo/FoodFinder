'use strict';

const request = require('request-promise').defaults({ encoding: null });

module.exports = {
    predict: predict
}

function predict(stream) {
    const options = {
        method: 'POST',
        url: 'https://southcentralus.api.cognitive.microsoft.com/customvision/v1.1/Prediction/5a744945-bed6-4618-9c4f-b6cbf6d10d73/image',        
        headers: {
            'Content-Type': 'application/octet-stream',
            'Prediction-Key': '687677d8866a493a8a97f5268d29d60a'
        },        
        body: stream
    };

    return request(options);
}
