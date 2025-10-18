import { Router } from 'express';
import { registerSchema, loginSchema, registerUser, loginUser } from './service';

const router = Router();

// POST /auth/register - Register new user
router.post('/register', async (req, res) => {
  try {
    // Validate request body
    const { email, password } = registerSchema.parse(req.body);

    // Register user
    const user = await registerUser(email, password);

    res.status(201).json({
      message: 'User registered successfully',
      user,
    });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    if (error.message === 'User already exists') {
      return res.status(409).json({ error: error.message });
    }
    console.error('Register error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /auth/login - Login user
router.post('/login', async (req, res) => {
  try {
    // Validate request body
    const { email, password } = loginSchema.parse(req.body);

    // Login user
    const result = await loginUser(email, password);

    res.status(200).json({
      message: 'Login successful',
      token: result.token,
      user: result.user,
    });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    if (error.message === 'Invalid credentials') {
      return res.status(401).json({ error: error.message });
    }
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /auth/logout - Logout user (client-side token removal)
router.post('/logout', (req, res) => {
  // In JWT-based auth, logout is handled client-side by removing the token
  res.status(200).json({ message: 'Logout successful' });
});

export default router;
