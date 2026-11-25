import CollectionDetail from './CollectionDetail'

// The collection name is encrypted; CollectionDetail replaces this with
// "<name> — Link Vault" once it's decrypted.
export const metadata = { title: 'Collection — Link Vault' }

export default async function CollectionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <CollectionDetail key={id} collectionId={id} />
}
