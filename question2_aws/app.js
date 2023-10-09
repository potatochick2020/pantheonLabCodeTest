const http = require('http');
const url = require('url');
const uuid = require('uuid');
const bcrypt = require('bcrypt');
const AWS = require('aws-sdk'),
      {
        CognitoIdentityProvider: CognitoIdentityServiceProvider
      } = require("@aws-sdk/client-cognito-identity-provider")

const USER_TABLE = 'USER_TABLE'; // Your DynamoDB table name
const AWS_REGION = 'us-east-1'; // AWS region
const COGNITO_CLIENT_ID = '56vdpo462sp7pgplgun4tlluei'; // Cognito Client ID
const COGNITO_USER_POOL_ID = 'us-east-1_CpV0wrtg8'; // Cognito User Pool ID
const SALT_ROUNDS = 10; // Number of bcrypt salt rounds
const SECRET_KEY = '58e870e62b44ffa3888e83aa4d0c11efcfb2d4aa4a175e0524f73005bb4f8a44'; // Secret key for JWT token

AWS.config.update({ region: AWS_REGION });

// const dynamoDB = DynamoDBDocument.from(new DynamoDB({
//   region: AWS_REGION,
//   credentials: {
//     accessKeyId: "AKIAQXT4DFX5JA2SHEOJ",
//     secretAccessKey: "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"
//   }
// }));

const cognito = new CognitoIdentityServiceProvider({
  region: AWS_REGION,
  credentials: {
    accessKeyId: "AKIAQXT4DFX5JA2SHEOJ",
    secretAccessKey: "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"
  }
});
const server = http.createServer((req, res) => {
  const { method, url } = req;

  if (method === 'POST' && url === '/register') {
    // Register a new user
    let body = '';

    req.on('data', (chunk) => {
      body += chunk;
    });

    req.on('end', () => {
      const userData = JSON.parse(body);

      // Hash the user's password
      
          const params = {
            ClientId: COGNITO_CLIENT_ID,
            Username: userData.email,
            Password: userData.password,
            UserAttributes: [
              {
                Name: 'email',
                Value: userData.email,
              },
            ],
          };

          cognito.signUp(params, (err, data) => {
            if (err) {
              console.error('Error registering user:', err);
              res.statusCode = 500;
              res.end(JSON.stringify({ message: 'Error registering user' , Error : err}));
            } else {
              res.statusCode = 200;
              res.end(JSON.stringify({ message: 'User registered successfully' }));
            }
          });
    });
  } else if (method === 'POST' && url === '/login') {
    // User login
    let body = '';

    req.on('data', (chunk) => {
      body += chunk;
    });

    req.on('end', () => {
      const loginData = JSON.parse(body);

      const authParams = {
        AuthFlow: 'USER_PASSWORD_AUTH',
        ClientId: COGNITO_CLIENT_ID,
        AuthParameters: {
          USERNAME: loginData.email,
          PASSWORD: loginData.password,
        },
      };

      cognito.initiateAuth(authParams, (err, data) => {
        if (err) {
          console.error('Error logging in:', err);
          res.statusCode = 401;
          res.end(JSON.stringify({ message: 'Authentication failed' }));
        } else {
          // Generate a JWT token with a 24-hour expiration
          const token = jwt.sign({}, SECRET_KEY, { expiresIn: '24h' });

          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ token }));
        }
      });
    });
  } else if (method === 'POST' && url === '/logout') {
    // Logout (JWT tokens are stateless, so there's no server-side logout)
    res.statusCode = 200;
    res.end(JSON.stringify({ message: 'Logout successful' }));
  } else if (method === 'GET' && url === '/getAuthToken') {
    // Get the JWT token
    const token = jwt.sign({}, SECRET_KEY, { expiresIn: '24h' });

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ token }));
  } else {
    res.statusCode = 404;
    res.end(JSON.stringify({ message: 'Not Found' }));
  }
});

const PORT = 3001;
server.listen(PORT, () => {
  console.log(`Server is listening on port ${PORT}`);
});