<div class="table-wrap" aria-busy="true" aria-label="Loading torrent results">
	<table>
		<thead>
			<tr>
				<th class="col-quality">Quality</th>
				<th>Release Title</th>
				<th class="col-size">Size</th>
				<th class="right">Seeds</th>
				<th class="right">Peers</th>
				<th class="right">Age</th>
			</tr>
		</thead>
		<tbody>
			{#each Array.from({ length: 8 }, (_, i) => i) as i (i)}
				<tr>
					<td class="col-quality">
						<div class="skeleton-badge"></div>
					</td>
					<td>
						<div class="skeleton-title-row">
							<div class="skeleton-btn"></div>
							<div class="skeleton-line w-80"></div>
						</div>
					</td>
					<td class="col-size">
						<div class="skeleton-line w-40"></div>
					</td>
					<td class="right">
						<div class="skeleton-line w-24 right-line"></div>
					</td>
					<td class="right">
						<div class="skeleton-line w-24 right-line"></div>
					</td>
					<td class="right">
						<div class="skeleton-line w-48 right-line"></div>
					</td>
				</tr>
			{/each}
		</tbody>
	</table>
</div>

<style>
	@keyframes shimmer {
		0% {
			background-position: -400px 0;
		}
		100% {
			background-position: 400px 0;
		}
	}

	.table-wrap {
		overflow-x: auto;
		border-radius: var(--radius-md);
		border: 1px solid var(--border);
		background: var(--surface);
	}

	table {
		width: 100%;
		border-collapse: collapse;
		font-family: var(--font-body);
		font-size: 13px;
	}

	thead {
		background: var(--surface-2);
		border-bottom: 1px solid var(--border);
	}

	th {
		text-align: left;
		padding: 12px 14px;
		font-family: var(--font-mono);
		font-size: 11px;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--muted);
		font-weight: 600;
		white-space: nowrap;
	}

	.col-quality {
		width: 120px;
	}

	td {
		padding: 12px 14px;
		border-bottom: 1px solid var(--border);
		vertical-align: middle;
	}

	tr:last-child td {
		border-bottom: none;
	}

	tr {
		background: var(--surface);
	}

	.skeleton-title-row {
		display: flex;
		align-items: center;
		gap: 10px;
	}

	.skeleton-badge,
	.skeleton-btn,
	.skeleton-line {
		border-radius: 4px;
		background: linear-gradient(
			90deg,
			var(--surface) 25%,
			var(--surface-2) 50%,
			var(--surface) 75%
		);
		background-size: 800px 100%;
		animation: shimmer 1.4s infinite linear;
	}

	.skeleton-badge {
		width: 78px;
		height: 20px;
	}

	.skeleton-btn {
		width: 64px;
		height: 22px;
		flex-shrink: 0;
	}

	.skeleton-line {
		height: 12px;
	}

	.skeleton-line.w-80 {
		width: 70%;
	}
	.skeleton-line.w-48 {
		width: 48px;
	}
	.skeleton-line.w-40 {
		width: 48px;
	}
	.skeleton-line.w-24 {
		width: 28px;
	}

	.right {
		text-align: right;
	}

	.right-line {
		margin-left: auto;
	}

	@media (prefers-reduced-motion: reduce) {
		.skeleton-badge,
		.skeleton-btn,
		.skeleton-line {
			animation: none;
		}
	}
</style>
