# app.py
from flask import Flask, request, jsonify
from flask_cors import CORS
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain.embeddings import GooglePalmEmbeddings
from langchain.vectorstores import FAISS
from langchain.chains.summarize import load_summarize_chain
from langchain.llms import GooglePalm
from PyPDF2 import PdfReader
import os
from dotenv import load_dotenv
load_dotenv()

app = Flask(__name__)
CORS(app)

# Set your Google Palm API key
os.environ["GOOGLE_API_KEY"] = os.getenv("GOOGLE_API_KEY")

from langchain.text_splitter import RecursiveCharacterTextSplitter

def process_pdf(file, summary_length):
    # Extract text from PDF
    pdf_reader = PdfReader(file)
    text = ""
    for page in pdf_reader.pages:
        text += page.extract_text()

    # Split text into smaller chunks
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=500,  # Reduce chunk size
        chunk_overlap=50,  # Reduce overlap
        length_function=len
    )
    chunks = text_splitter.split_text(text)

    # Create embeddings and vector store
    embeddings = GooglePalmEmbeddings()
    
    # Process chunks in batches
    batch_size = 20  # Adjust this value based on your needs
    knowledge_base = None
    for i in range(0, len(chunks), batch_size):
        batch = chunks[i:i+batch_size]
        if knowledge_base is None:
            knowledge_base = FAISS.from_texts(batch, embeddings)
        else:
            knowledge_base.add_texts(batch)

    # Create LLM and summarization chain
    llm = GooglePalm()
    chain = load_summarize_chain(llm, chain_type="map_reduce")

    # Generate summary
    docs = knowledge_base.similarity_search(text[:1000], k=4)  # Use a smaller portion of text for similarity search
    summary = chain.run(docs)

    # Truncate summary to desired length
    return summary[:summary_length]

@app.route('/summarize', methods=['POST'])
def summarize():
    if 'file' not in request.files:
        return jsonify({"error": "No file part"}), 400
    file = request.files['file']
    summary_length = int(request.form.get('summary_length', 500))
    
    if file.filename == '':
        return jsonify({"error": "No selected file"}), 400
    
    if file and file.filename.endswith('.pdf'):
        try:
            summary = process_pdf(file, summary_length)
            return jsonify({"summary": summary})
        except Exception as e:
            return jsonify({"error": str(e)}), 500
    else:
        return jsonify({"error": "Invalid file type"}), 400

if __name__ == '__main__':
    app.run(debug=True)