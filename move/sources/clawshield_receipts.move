module clawshield_receipts::clawshield_receipts {
    use sui::event;

    public struct ReceiptEmitted has copy, drop {
        content_hash: vector<u8>,
        policy_hash: vector<u8>,
        verdict: u8,
        risk_score: u8,
        policy_version: u64,
        timestamp_ms: u64,
        walrus_blob_id: vector<u8>
    }

    public entry fun record_receipt(
        content_hash: vector<u8>,
        policy_hash: vector<u8>,
        verdict: u8,
        risk_score: u8,
        policy_version: u64,
        timestamp_ms: u64,
        walrus_blob_id: vector<u8>
    ) {
        event::emit(ReceiptEmitted {
            content_hash,
            policy_hash,
            verdict,
            risk_score,
            policy_version,
            timestamp_ms,
            walrus_blob_id
        });
    }
}
