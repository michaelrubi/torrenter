<div class="table-container">
	<table>
		<thead>
			<tr>
				<th class="title">Title</th>
				<th class="size">Size</th>
				<th class="seeds right">Seeds</th>
				<th class="peers right">Peers</th>
				<th class="date right">Age</th>
			</tr>
		</thead>
		<tbody>
			{#each Array(10) as _}
				<tr>
					<td class="title">
						<div class="skeleton-text title-skeleton"></div>
					</td>
					<td class="size">
						<div class="skeleton-text size-skeleton"></div>
					</td>
					<td class="seeds right">
						<div class="skeleton-text number-skeleton"></div>
					</td>
					<td class="peers right">
						<div class="skeleton-text number-skeleton"></div>
					</td>
					<td class="date right">
						<div class="skeleton-text date-skeleton"></div>
					</td>
				</tr>
			{/each}
		</tbody>
	</table>
</div>

<style>
	.table-container {
		width: 100%;
		overflow-x: auto;
		margin-top: 2rem;
		border: 1px solid var(--border-color);
		border-radius: 8px;
		background-color: var(--surface-color);
	}

	table {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.9rem;
	}

	th,
	td {
		padding: 1rem;
		text-align: left;
		border-bottom: 1px solid var(--border-color);
	}

	th {
		background-color: rgba(255, 255, 255, 0.03);
		color: var(--text-secondary);
		font-weight: 600;
		font-size: 0.8rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.right {
		text-align: right;
	}

	.right .skeleton-text {
		margin-left: auto;
	}

	/* Skeleton Styles */
	.skeleton-text {
		height: 1em;
		background-color: rgba(255, 255, 255, 0.05);
		border-radius: 4px;
		animation: pulse 1.5s infinite ease-in-out;
	}

	.title-skeleton {
		width: 60%;
	}

	.size-skeleton {
		width: 60px;
	}

	.number-skeleton {
		width: 30px;
	}

	.date-skeleton {
		width: 80px;
	}

	@keyframes pulse {
		0% {
			opacity: 0.4;
		}
		50% {
			opacity: 0.8;
		}
		100% {
			opacity: 0.4;
		}
	}
</style>
