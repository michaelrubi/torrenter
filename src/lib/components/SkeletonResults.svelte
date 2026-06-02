<div class="table-wrap">
	<table>
		<thead>
			<tr>
				<th>Title</th>
				<th>Size</th>
				<th class="right">Seeds</th>
				<th class="right">Peers</th>
				<th class="right">Age</th>
			</tr>
		</thead>
		<tbody>
			{#each Array(8) as _}
				<tr>
					<td>
						<div class="skeleton-line w-80"></div>
					</td>
					<td>
						<div class="skeleton-line w-40"></div>
					</td>
					<td class="right">
						<div class="skeleton-line w-24"></div>
					</td>
					<td class="right">
						<div class="skeleton-line w-24"></div>
					</td>
					<td class="right">
						<div class="skeleton-line w-48"></div>
					</td>
				</tr>
			{/each}
		</tbody>
	</table>
</div>

<style>
	@keyframes shimmer {
		0%   { background-position: -400px 0; }
		100% { background-position: 400px 0; }
	}

	.table-wrap {
		overflow-x: auto;
		border-radius: var(--radius-md);
		border: 1px solid var(--border);
	}

	table {
		width: 100%;
		border-collapse: collapse;
		font-family: var(--font-body);
		font-size: var(--fs-body);
	}

	thead {
		background: var(--surface-2);
		border-bottom: 1px solid var(--border);
	}

	th {
		text-align: left;
		padding: 10px 14px;
		font-family: var(--font-mono);
		font-size: 11px;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: var(--muted);
		font-weight: 500;
		white-space: nowrap;
	}

	td {
		padding: 10px 14px;
		border-bottom: 1px solid var(--border);
		vertical-align: middle;
	}

	tr:last-child td {
		border-bottom: none;
	}

	tr {
		background: var(--surface);
	}

	.skeleton-line {
		height: 12px;
		border-radius: 3px;
		background: linear-gradient(90deg, var(--surface) 25%, var(--surface-2) 50%, var(--surface) 75%);
		background-size: 800px 100%;
		animation: shimmer 1.4s infinite linear;
	}

	.skeleton-line.w-80 { width: 80%; }
	.skeleton-line.w-48 { width: 48px; }
	.skeleton-line.w-40 { width: 40px; }
	.skeleton-line.w-24 { width: 24px; }

	.right {
		text-align: right;
	}

	@media (prefers-reduced-motion: reduce) {
		.skeleton-line {
			animation: none;
		}
	}
</style>