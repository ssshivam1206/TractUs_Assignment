import express from 'express';
import dotenv from 'dotenv';

dotenv.config();

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/health', (req, res) => {
  res.status(200).json({ message: 'OK' });
});

const PORT = Number(process.env.PORT ?? 3000);
app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));

export default app;
