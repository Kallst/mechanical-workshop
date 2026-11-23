import { authentication } from '../src/bootstrap/services';
import { pool } from '../src/adapters/outbound/persistence/postgres/pool';
const password = process.env.DEMO_PASSWORD;
if (!password || password.length < 12 || password.length > 128)
    throw new Error('Set DEMO_PASSWORD to 12–128 characters in .env.local.');
try {
    const result = await authentication.seedDefaultWorkspace(password);
    console.log(result.created ? 'Created workshop-demo with seven employee accounts. Password is configured privately in DEMO_PASSWORD.' : 'Default demonstration already exists; no existing data or passwords changed.');
}
finally {
    await pool().end();
}
