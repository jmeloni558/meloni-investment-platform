import { withSupabase } from 'npm:@supabase/server@1.4.1';
import schema from '../bpo-extract/fields.json' with { type: 'json' };
import { createHandler } from './handler.mjs';

export default {fetch:withSupabase({auth:'user'},createHandler({schema,env:(name:string)=>Deno.env.get(name)}))};
