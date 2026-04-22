import React, { useState, useEffect } from 'react';
import { Box, Button, Typography, TextField, Paper, Alert, CircularProgress, Tabs, Tab } from '@mui/material';
import { auth } from '../firebase';

export default function GraphQLView() {
  const [jsonInput, setJsonInput] = useState('');
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'info', text: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [queries, setQueries] = useState<any[]>([]);
  const [selectedQuery, setSelectedQuery] = useState<any | null>(null);
  const [variables, setVariables] = useState('{}');
  const [result, setResult] = useState('');

  const handleUpload = async () => {
    try {
      setIsLoading(true);
      const parsed = JSON.parse(jsonInput);
      
      if (!parsed.operations || !Array.isArray(parsed.operations)) {
        throw new Error("Invalid format. Expected 'operations' array.");
      }

      const token = await auth.currentUser?.getIdToken();
      const response = await fetch('/api/graphql/upload-queries', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ operations: parsed.operations }),
      });

      if (!response.ok) {
        throw new Error('Failed to upload queries to server');
      }

      setQueries(parsed.operations);
      setStatusMessage({ type: 'success', text: `Successfully loaded ${parsed.operations.length} queries.` });
    } catch (error: any) {
      setStatusMessage({ type: 'error', text: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleExecute = async () => {
    if (!selectedQuery) return;
    
    try {
      setIsLoading(true);
      let parsedVars = {};
      try {
        parsedVars = JSON.parse(variables);
      } catch (e) {
        throw new Error("Invalid variables JSON");
      }

      const token = await auth.currentUser?.getIdToken();
      const response = await fetch('/api/graphql', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          operationName: selectedQuery.name,
          query: selectedQuery.body,
          variables: parsedVars
        }),
      });

      const data = await response.json();
      setResult(JSON.stringify(data, null, 2));
      setStatusMessage({ type: 'success', text: 'Query executed successfully.' });
    } catch (error: any) {
      setStatusMessage({ type: 'error', text: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box sx={{ p: 4, maxWidth: 1200, mx: 'auto' }}>
      <Typography variant="h4" gutterBottom>GraphQL Operations & MCP Server</Typography>
      <Typography variant="body1" sx={{ mb: 3, color: 'text.secondary' }}>
        Upload your Apollo Persisted Query Manifest to enable GraphQL operations across the app.
      </Typography>

      {statusMessage && (
        <Alert severity={statusMessage.type} sx={{ mb: 3 }}>
          {statusMessage.text}
        </Alert>
      )}

      <Paper elevation={2} sx={{ p: 3, mb: 4 }}>
        <Typography variant="h6" gutterBottom>1. Upload Apollo Manifest</Typography>
        <TextField
          fullWidth
          multiline
          rows={6}
          label="Paste Apollo Persisted Query JSON here"
          variant="outlined"
          value={jsonInput}
          onChange={(e) => setJsonInput(e.target.value)}
          disabled={isLoading}
          sx={{ mb: 2 }}
        />
        <Button
          variant="contained"
          color="primary"
          onClick={handleUpload}
          disabled={isLoading || !jsonInput.trim()}
        >
          {isLoading ? <CircularProgress size={24} /> : 'Upload Queries'}
        </Button>
      </Paper>

      {queries.length > 0 && (
        <Paper elevation={2} sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>2. Execute Operations</Typography>
          <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
            <TextField
              select
              fullWidth
              label="Select Query"
              value={selectedQuery?.name || ''}
              onChange={(e) => {
                const q = queries.find(q => q.name === e.target.value);
                setSelectedQuery(q || null);
              }}
              SelectProps={{ native: true }}
            >
              <option value="">-- Select Operation --</option>
              {queries.map(q => (
                <option key={q.id} value={q.name}>{q.name} ({q.type})</option>
              ))}
            </TextField>
          </Box>

          {selectedQuery && (
            <>
              <TextField
                fullWidth
                multiline
                rows={4}
                label="Variables (JSON)"
                variant="outlined"
                value={variables}
                onChange={(e) => setVariables(e.target.value)}
                sx={{ mb: 2 }}
              />
              <Button
                variant="contained"
                color="secondary"
                onClick={handleExecute}
                disabled={isLoading}
                sx={{ mb: 2 }}
              >
                Execute
              </Button>
            </>
          )}

          {result && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle1">Result:</Typography>
              <Paper sx={{ p: 2, bgcolor: '#1e1e1e', color: '#d4d4d4', overflowX: 'auto' }}>
                <pre style={{ margin: 0 }}>{result}</pre>
              </Paper>
            </Box>
          )}
        </Paper>
      )}
    </Box>
  );
}
