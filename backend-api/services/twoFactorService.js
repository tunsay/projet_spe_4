// backend-api/services/twoFactorService.js

const { authenticator } = require("otplib");
const qrcode = require("qrcode");

const APP_NAME = "Wiki Drive";

/**
 * Génère un nouveau secret 2FA et l'URL du code QR.
 * @param {string} email L'email de l'utilisateur.
 * @returns {{secret: string, otpAuthUrl: string, qrCodeDataURL: string}}
 */
const generateTwoFactorSecret = async (email) => {
    // 1. Générer le secret
    const secret = authenticator.generateSecret();

    // 2. Générer l'URL au format 'otpauth://...'
    const otpAuthUrl = authenticator.keyuri(email, APP_NAME, secret);

    // 3. Générer l'image QR code (pour l'affichage à l'utilisateur)
    const qrCodeDataURL = await qrcode.toDataURL(otpAuthUrl);

    return {
        secret,
        otpAuthUrl,
        qrCodeDataURL,
    };
};

/**
 * Vérifie si le jeton TOTP fourni correspond au secret.
 * @param {string} token Le code TOTP à 6 chiffres.
 * @param {string} secret Le secret 2FA stocké pour l'utilisateur.
 * @returns {boolean} True si le jeton est valide.
 */
const verifyTwoFactorToken = (token, secret) => {
    return authenticator.verify({ token, secret });
};

module.exports = {
    generateTwoFactorSecret,
    verifyTwoFactorToken,
};
