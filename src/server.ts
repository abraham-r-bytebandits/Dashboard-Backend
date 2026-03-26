import app from "./app";
import rateLimit from "express-rate-limit";
const PORT = 4000;

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
});

(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

app.use(limiter);
