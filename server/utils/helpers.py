from bson import ObjectId
from datetime import datetime

def serialize_doc(doc):
    if doc is None:
        return None
    if isinstance(doc, list):
        return [serialize_doc(item) for item in doc]
    
    if not isinstance(doc, dict):
        # Handle cases where doc is unexpected type
        return doc
        
    doc = dict(doc)
    if '_id' in doc:
        doc['id'] = str(doc['_id'])
        doc['_id'] = str(doc['_id'])
        
    for k, v in list(doc.items()):
        if isinstance(v, dict):
            doc[k] = serialize_doc(v)
        elif isinstance(v, list):
            doc[k] = [serialize_doc(item) if isinstance(item, dict) else (str(item) if isinstance(item, ObjectId) else item) for item in v]
        elif isinstance(v, ObjectId):
            doc[k] = str(v)
        elif isinstance(v, datetime):
            # Convert python datetime to ISO format string matching JavaScript's toISOString() format: 'YYYY-MM-DDTHH:mm:ss.sssZ'
            # Node.js returns UTC times with 'Z'. Let's format it.
            doc[k] = v.strftime('%Y-%m-%dT%H:%M:%S.%f')[:-3] + 'Z'
            
    return doc
