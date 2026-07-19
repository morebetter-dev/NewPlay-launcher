exports.isDisplayableError = error => error != null
    && typeof error.title === 'string'
    && typeof error.desc === 'string'
