const express = require('express');
const cors = require('cors');
const {connect} = require('mongoose');
require('dotenv').config();


const app = express();
app.use(express.json({extended: true}));
app.use(express.urlencoded({extended: true}));
app.use(cors({credentials: true, origin: ['http://localhost:3000']}));


app.get('/', (req, res) => {
  res.send('Server is running!');
});

app.listen(process.env.PORT || 5000, () => 
    console.log(`Server is running on port ${process.env.PORT || 5000}`)
);

// app.listen(process.env.PORT || 5000, async () => {
//     try {
//         await connect(process.env.MONGO_URI, {useNewUrlParser: true, useUnifiedTopology: true});
//         console.log('Connected to MongoDB');
//     } catch (error) {
//         console.log(error);
//     }
//     console.log(`Server is running on port ${process.env.PORT || 5000}`);
// });