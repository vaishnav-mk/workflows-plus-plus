import { WorkflowEntrypoint } from 'cloudflare:workers';

export class WindSatisfiedTempleWorkflow extends WorkflowEntrypoint {
	async run(event, step) {
		console.log(
			JSON.stringify({
				type: 'WF_START',
				timestamp: Date.now(),
				instanceId: event.instanceId,
				eventTimestamp: event.timestamp,
				payload: event.payload,
			}),
		);
		const _workflowResults = {};
		const _workflowState = {};

		try {
			console.log(
				JSON.stringify({
					type: 'WF_NODE_START',
					nodeId: 'step_entry_0',
					nodeName: 'Entry',
					nodeType: 'entry',
					timestamp: Date.now(),
					instanceId: event.instanceId,
				}),
			);
			// Workflow entry point
			_workflowState['step_entry_0'] = {
				input: event.payload,
				output: event.payload,
			};
			console.log(
				JSON.stringify({
					type: 'WF_NODE_END',
					nodeId: 'step_entry_0',
					nodeName: 'Entry',
					nodeType: 'entry',
					timestamp: Date.now(),
					instanceId: event.instanceId,
					success: true,
					output: _workflowState['step_entry_0']?.output,
				}),
			);
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			console.log(
				JSON.stringify({
					type: 'WF_NODE_ERROR',
					nodeId: 'step_entry_0',
					nodeName: 'Entry',
					nodeType: 'entry',
					timestamp: Date.now(),
					instanceId: event.instanceId,
					success: false,
					error: errorMessage,
				}),
			);
			throw error;
		}

		try {
			console.log(
				JSON.stringify({
					type: 'WF_NODE_START',
					nodeId: 'step_http_request_1',
					nodeName: 'HTTP Request',
					nodeType: 'http-request',
					timestamp: Date.now(),
					instanceId: event.instanceId,
				}),
			);
			_workflowResults.step_http_request_1 = await step.do('step_http_request_1', async () => {
				const inputData = _workflowState['step_entry_0']?.output || event.payload;
				const response = await fetch('https://api.jolpi.ca/ergast/f1/current/driverStandings.json', {
					method: 'GET',
					headers: {
						// No custom headers
					},

					signal: AbortSignal.timeout(150000),
				});
				if (!response.ok) {
					throw new Error(`HTTP ${response.status}: ${response.statusText}`);
				}
				const body = await response.json();
				const result = {
					status: response.status,
					headers: Object.fromEntries(response.headers.entries()),
					body: body,
					message: 'HTTP request completed successfully',
				};
				_workflowState['step_http_request_1'] = {
					input: inputData,
					output: result,
				};
				return result;
			});
			console.log(
				JSON.stringify({
					type: 'WF_NODE_END',
					nodeId: 'step_http_request_1',
					nodeName: 'HTTP Request',
					nodeType: 'http-request',
					timestamp: Date.now(),
					instanceId: event.instanceId,
					success: true,
					output: _workflowState['step_http_request_1']?.output,
				}),
			);
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			console.log(
				JSON.stringify({
					type: 'WF_NODE_ERROR',
					nodeId: 'step_http_request_1',
					nodeName: 'HTTP Request',
					nodeType: 'http-request',
					timestamp: Date.now(),
					instanceId: event.instanceId,
					success: false,
					error: errorMessage,
				}),
			);
			throw error;
		}

		try {
			console.log(
				JSON.stringify({
					type: 'WF_NODE_START',
					nodeId: 'step_r2-get_3',
					nodeName: 'R2 Get',
					nodeType: 'r2-get',
					timestamp: Date.now(),
					instanceId: event.instanceId,
				}),
			);
			_workflowResults.step_r2_get_3 = await step.do('step_r2-get_3', async () => {
				const inputData = _workflowState['step_http_request_1']?.output || event.payload;
				const key = '10/deploy-workers-applications-in-seconds-2025-04-08.json';
				const bucket = this.env['cloudflare_blogs'];
        console.log({bucket});

				// Get object metadata using head() - this is faster than get() as it doesn't download the body
				const object = await bucket.get(key);
        console.log({object});

				if (!object) {
					const result = {
						signedUrl: null,
						exists: false,
						metadata: null,
					};
					_workflowState['step_r2-get_3'] = {
						input: inputData,
						output: result,
					};
					return result;
				}

				// Generate signed URL
				// If publicUrl is configured (from R2 custom domain or public URL), use it
				// Otherwise, generate a presigned URL using the R2 API
				let signedUrl = null;
				const publicUrl = null;
				const expiresAt = Math.floor(Date.now() / 1000) + 3600;

				if (publicUrl) {
					// Use provided public URL (from R2 custom domain or public URL configuration)
					// Append expiration timestamp as query parameter
					const urlKey = encodeURIComponent(key).replace(/%2F/g, '/');
					signedUrl = `${publicUrl.replace(/\/$/, '')}/${urlKey}?expires=${expiresAt}`;
				} else {
					// Generate presigned URL using R2 API
					// This requires making an authenticated request to Cloudflare R2 API
					// For now, we'll construct a URL that can be used with R2's public endpoint
					// In production, you would call the R2 API to generate a proper presigned URL
					// Note: R2 doesn't have built-in presigned URL generation in Workers runtime
					// You need to use the R2 API or configure a public URL for the bucket
					signedUrl = `r2://${key}?expires=${expiresAt}&bucket=${bucket}`;
				}

				const result = {
					signedUrl,
					exists: true,
					metadata: {
						key: object.key,
						version: object.version,
						size: object.size,
						etag: object.etag,
						httpEtag: object.httpEtag,
						uploaded: object.uploaded.toISOString(),
						httpMetadata: object.httpMetadata || {},
						customMetadata: object.customMetadata || {},
						storageClass: object.storageClass,
					},
				};
				_workflowState['step_r2-get_3'] = {
					input: inputData,
					output: result,
				};
				return result;
			});
			console.log(
				JSON.stringify({
					type: 'WF_NODE_END',
					nodeId: 'step_r2-get_3',
					nodeName: 'R2 Get',
					nodeType: 'r2-get',
					timestamp: Date.now(),
					instanceId: event.instanceId,
					success: true,
					output: _workflowState['step_r2-get_3']?.output,
				}),
			);
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			console.log(
				JSON.stringify({
					type: 'WF_NODE_ERROR',
					nodeId: 'step_r2-get_3',
					nodeName: 'R2 Get',
					nodeType: 'r2-get',
					timestamp: Date.now(),
					instanceId: event.instanceId,
					success: false,
					error: errorMessage,
				}),
			);
			throw error;
		}

		try {
			console.log(
				JSON.stringify({
					type: 'WF_NODE_START',
					nodeId: 'step_return_2',
					nodeName: 'Return',
					nodeType: 'return',
					timestamp: Date.now(),
					instanceId: event.instanceId,
				}),
			);
			_workflowResults.step_return_2 = await step.do('step_return_2', async () => {
				const result = _workflowState['step_r2-get_3']?.output || event.payload;
				_workflowState['step_return_2'] = {
					input: _workflowState['step_r2-get_3']?.output || event.payload,
					output: result,
				};
				return result;
			});
			console.log(
				JSON.stringify({
					type: 'WF_NODE_END',
					nodeId: 'step_return_2',
					nodeName: 'Return',
					nodeType: 'return',
					timestamp: Date.now(),
					instanceId: event.instanceId,
					success: true,
					output: _workflowState['step_return_2']?.output,
				}),
			);
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			console.log(
				JSON.stringify({
					type: 'WF_NODE_ERROR',
					nodeId: 'step_return_2',
					nodeName: 'Return',
					nodeType: 'return',
					timestamp: Date.now(),
					instanceId: event.instanceId,
					success: false,
					error: errorMessage,
				}),
			);
			throw error;
		}
		console.log(JSON.stringify({ type: 'WF_END', timestamp: Date.now(), instanceId: event.instanceId, results: _workflowResults }));
		return _workflowResults;
	}
}

export default {
	async fetch(req, env) {
		console.log('🌐 === FETCH HANDLER STARTED ===');
		console.log('📡 Request URL:', req.url);
		console.log('📋 Request Method:', req.method);

		const instanceId = new URL(req.url).searchParams.get('instanceId');

		if (instanceId) {
			const instance = await env.WINDSATISFIEDTEMPLEWORKFLOW_WORKFLOW.get(instanceId);
			return Response.json({
				status: await instance.status(),
			});
		}

		const newId = await crypto.randomUUID();
		let instance = await env.WINDSATISFIEDTEMPLEWORKFLOW_WORKFLOW.create({
			id: newId,
		});
		return Response.json({
			id: instance.id,
			details: await instance.status(),
		});
	},
};
