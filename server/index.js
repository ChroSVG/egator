const express = require('express');
const cors = require('cors');
const {connect} = require('mongoose');
require('dotenv').config();

const Routes = require('./routes/Routes');
const {notFound, errorHandler} = require('./middleware/errorMiddleware');


const app = express();
app.use(express.json({extended: true}));
app.use(express.urlencoded({extended: true}));
app.use(cors({credentials: true, origin: ['http://localhost:3000']}));

app.use('/api', Routes);

app.use(notFound);
app.use(errorHandler);

app.listen(process.env.PORT || 5000, async () => {
    try {
        await connect(process.env.MONGO_URL, {useNewUrlParser: true, useUnifiedTopology: true});
        console.log('Connected to MongoDB');
    } catch (error) {
        console.log(error);
    }
    console.log(`Server is running on port ${process.env.PORT || 5000}`);
});

