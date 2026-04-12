import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { encrypt } from '@/lib/crypto';
import type { ConnectionRole, ConnectionType } from '@/lib/database.types';

export async function GET() {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from('connections')
    .select('id, workspace_id, type, role, config, status, created_at, updated_at')
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { workspaceId, type, role, config, credentials } = body as {
    workspaceId: string;
    type: ConnectionType;
    role: ConnectionRole;
    config: Record<string, unknown>;
    credentials: string;
  };

  const encryptedCredentials = encrypt(
    typeof credentials === 'string' ? credentials : JSON.stringify(credentials),
    process.env.ENCRYPTION_KEY!
  );

  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from('connections')
    .insert({
      workspace_id: workspaceId,
      type,
      role,
      config: config ?? {},
      encrypted_credentials: encryptedCredentials,
      status: 'active',
    })
    .select('id, type, role, status')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
