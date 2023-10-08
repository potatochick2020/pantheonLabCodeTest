const http = require('http');
const https = require('https');
const url = require('url');
const { graphql, buildSchema } = require('graphql');
const dotenv = require('dotenv'); // Add this line for .env file support
const crypto = require('crypto');

// Load environment variables from .env file (if present)
dotenv.config();

const UNSPLASH_API_KEY = process.env.UNSPLASH_API_KEY;
const PIXABAY_API_KEY = process.env.PIXABAY_API_KEY;
const STORYBLOCKS_PUBLIC_KEY = process.env.STORYBLOCKS_PUBLIC_KEY;
const STORYBLOCKS_PRIVATE_KEY = process.env.STORYBLOCKS_PRIVATE_KEY;

const schema = buildSchema(`
  type Image {
    image_ID: String
    thumbnails: String
    preview: String
    title: String
    source: String
    tags: [String]
  }

  type Query {
    searchPhoto(query: String!): [Image]
  }
`);

const rootValue = {
    searchPhoto: async ({ query }) => {
        console.log("QUERY",query)
        try {
            const [unsplashData, pixabayData, storyBlocksData] = await Promise.all([
                fetchUnsplashData(query),
                fetchPixabayData(query),
                fetchStoryBlocksData(query),
            ]);

            // Assuming each of the fetch functions returns data in the expected format
            const images = [unsplashData, pixabayData, storyBlocksData].filter(
                (result) => result !== null
            );

            return images.map((image) => ({
                image_ID: image.image_ID,
                thumbnails: image.thumbnails,
                preview: image.preview,
                title: image.title,
                source: image.source,
                tags: image.tags,
            }));
        } catch (error) {
            throw new Error('Error fetching data');
        }
    },
};




// Function to fetch data from Unsplash
function fetchUnsplashData(query) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'api.unsplash.com',
            path: `/search/photos?query=${query}&per_page=1&page=1`,
            method: 'GET',
            headers: {
                'Authorization': `Client-ID ${UNSPLASH_API_KEY}`,
            },
        };

        const unsplashRequest = https.request(options, (unsplashResponse) => {
            let data = '';

            unsplashResponse.on('data', (chunk) => {
                data += chunk;
            });

            unsplashResponse.on('end', () => {
                try {
                    const result = JSON.parse(data);

                    if (result.results && result.results.length > 0) {
                        const firstResult = result.results[0];

                        // Create a set to store unique tags
                        const uniqueTags = new Set();

                        // Extract tags and store them in the set
                        if (firstResult.tags && Array.isArray(firstResult.tags)) {
                            firstResult.tags.forEach((tag) => {
                                uniqueTags.add(tag.title);
                            });
                        }

                        // Create the response JSON object
                        const responseObject = {
                            image_ID: firstResult.id,
                            thumbnails: firstResult.urls.thumb,
                            preview: firstResult.urls.small,
                            title: firstResult.description,
                            source: 'Unsplash',
                            tags: Array.from(uniqueTags), // Convert the set to an array
                        };

                        resolve(responseObject);
                    } else {
                        reject('No results found');
                    }
                } catch (error) {
                    // Log the error and reject the promise
                    console.error(error);
                    reject('Error while processing Unsplash data');
                }
            });
        });

        unsplashRequest.on('error', (error) => {
            // Log the error and reject the promise
            console.error(error);
            reject('Error while making Unsplash request');
        });

        unsplashRequest.end();
    });
}

// Function to fetch data from Pixabay
function fetchPixabayData(query) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'pixabay.com',
            path: `/api/?key=${PIXABAY_API_KEY}&q=${query}&per_page=3`, // Set per_page to 3
            method: 'GET',
        };

        const pixabayRequest = https.request(options, (pixabayResponse) => {
            let data = '';

            pixabayResponse.on('data', (chunk) => {
                data += chunk;
            });

            pixabayResponse.on('end', () => {
                try {
                    const result = JSON.parse(data);
                    if (result.hits && result.hits.length > 0) {
                        const responseObject = {
                            image_ID: result.hits[0].id, // Use the first result
                            thumbnails: result.hits[0].previewURL, // Use the first result
                            preview: result.hits[0].largeImageURL, // Use the first result
                            title: null,
                            source: 'Pixabay',
                            tags: result.hits[0].tags.split(', '), // Use the first result
                        };
                        resolve(responseObject);
                    } else {
                        reject('No results found');
                    }
                } catch (error) {
                    // Log the error and reject the promise
                    console.error(error);
                    reject('Error while processing Pixabay data');
                }
            });
        });

        pixabayRequest.on('error', (error) => {
            // Log the error and reject the promise
            console.error(error);
            reject('Error while making Pixabay request');
        });

        pixabayRequest.end();
    });
}

// Function to fetch data from StoryBlocks
function fetchStoryBlocksData(query) {
    return new Promise((resolve, reject) => {
        const baseUrl = 'https://api.graphicstock.com';
        const resource = '/api/v2/images/search';
        const urlWithoutQueryParams = baseUrl + resource;

        const expires = Math.floor(Date.now() / 1000) + 100;
        const hmacBuilder = crypto.createHmac('sha256', STORYBLOCKS_PRIVATE_KEY + expires);
        hmacBuilder.update(resource);
        const hmac = hmacBuilder.digest('hex');

        const options = {
            hostname: 'api.graphicstock.com',
            path: `/api/v2/images/search?EXPIRES=${expires}&HMAC=${hmac}&project_id=testingProject001&user_id=testingUser001&APIKEY=${STORYBLOCKS_PUBLIC_KEY}&keyword=${query}`,
            method: 'GET',
        };

        const storyBlocksRequest = https.request(options, (storyBlocksResponse) => {
            let data = '';

            storyBlocksResponse.on('data', (chunk) => {
                data += chunk;
            });

            storyBlocksResponse.on('end', () => {
                try {
                    const result = JSON.parse(data);
                    if (result.results.length > 0) {
                        const responseObject = {
                            image_ID: result.results[0].id, // Use the first result
                            thumbnails: result.results[0].thumbnail_url, // Use the first result
                            preview: result.results[0].preview_url, // Use the first result
                            title: result.results[0].title,
                            source: 'StoryBlocks',
                            tags: null, // Use the first result
                        };
                        resolve(responseObject);
                    } else {
                        reject('No results found');
                    }
                } catch (error) {
                    // Log the error and reject the promise
                    console.error(error);
                    reject('Error while processing StoryBlocks data');
                }
            });
        });

        storyBlocksRequest.on('error', (error) => {
            // Log the error and reject the promise
            console.error(error);
            reject('Error while making StoryBlocks request');
        });

        storyBlocksRequest.end();
    });
}

const server = http.createServer((req, res) => {
    const parsedUrl = url.parse(req.url, true);
    const query = parsedUrl.query.query;
    console.log(query)
    if (parsedUrl.pathname === '/api/search/photo' && query) {
        // Use Promise.all to make concurrent requests to Unsplash, Pixabay, and StoryBlocks
        Promise.all([
            fetchUnsplashData(query).catch((error) => {
                console.error("Error - Unsplash:" + error);
                return null;
            }),
            fetchPixabayData(query).catch((error) => {
                console.error("Error - Pixabay" + error);
                return null;
            }),
            fetchStoryBlocksData(query).catch((error) => {
                console.error("Error - StoryBlocks" + error);
                return null;
            }),
        ])
            .then((results) => {
                // Filter out null results (Unsplash, Pixabay, and StoryBlocks errors)
                const filteredResults = results.filter((result) => result !== null);

                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(filteredResults));
            })
            .catch((error) => {
                res.writeHead(404, { 'Content-Type': 'text/plain' });
                res.end(error);
            });
    } else if (req.method === 'POST' && parsedUrl.pathname === '/graphql/api/search/photo') {
        let requestBody = '';
        
        req.on('data', (chunk) => {
            requestBody += chunk;
        });

        req.on('end', () => {
            try {
                const requestBodyObj = JSON.parse(requestBody);
                const graphqlQuery = requestBodyObj.query;

                graphql({ schema, source: graphqlQuery, rootValue})
                    .then((response) => {
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify(response));
                    })
                    .catch((error) => {
                        console.error(error);
                        res.writeHead(500, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ error: 'Internal Server Error' }));
                    });
            } catch (error) {
                res.writeHead(400, { 'Content-Type': 'text/plain' });
                res.end('Bad Request');
            }
        });
    } else {
        res.writeHead(400, { 'Content-Type': 'text/plain' });
        res.end('Bad Request');
    }
});

const PORT = 3000;
server.listen(PORT, () => {
    console.log(`Server is listening on port ${PORT}`);
});
