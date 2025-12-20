// ISTRUZIONI PER L'INSTALLAZIONE:
// 1. Vai sul tuo Google Sheet -> Estensioni -> Apps Script.
// 2. Cancella tutto il codice presente e incolla questo script.
// 3. Clicca su "Distribuisci" (Deploy) -> "Nuova distribuzione".
// 4. Seleziona tipo: "App web".
// 5. Descrizione: "API Ordini".
// 6. Esegui come: "Me" (il tuo account).
// 7. Chi può accedere: "Chiunque" (Anyone) -> FONDAMENTALE per far funzionare il sito senza login.
// 8. Copia l'URL generato (Web App URL) e incollalo in pagamento.html alla voce PURCHASE_ENDPOINT.

function doPost(e) {
  // Blocca lo script per evitare sovrapposizioni se arrivano ordini simultanei
  var lock = LockService.getScriptLock();
  lock.tryLock(10000); // Aspetta fino a 10 secondi

  try {
    // Seleziona il foglio attivo o creane uno specifico chiamato "Ordini"
    var doc = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = doc.getSheetByName('Ordini');
    
    // Se il foglio non esiste, crealo e aggiungi le intestazioni
    if (!sheet) {
      sheet = doc.insertSheet('Ordini');
      sheet.appendRow([
        'Data', 'Email', 'Nome', 'Cognome', 
        'Indirizzo', 'Città', 'CAP', 'Cantone', 
        'Messaggio', 'Articoli', 'Subtotale', 'Spedizione', 'Totale', 'Stato'
      ]);
    }

    // Leggi i dati inviati dal sito (JSON)
    var data = JSON.parse(e.postData.contents);

    // Formatta la lista degli articoli in una stringa leggibile
    // Esempio: "Vaso (x1) | Collana (x2)"
    var itemsStr = data.items.map(function(item) {
      return (item.titolo || 'Articolo') + ' (x' + (item.qty || 1) + ')';
    }).join(' | ');

    // Prepara la riga da inserire
    var newRow = [
      new Date(),           // B: Data (Server time)
      data.buyer.email,     // C: Email
      data.buyer.nome,      // D: Nome
      data.buyer.cognome,   // E: Cognome
      data.buyer.indirizzo, // F: Indirizzo
      data.buyer.citta,     // G: Città
      data.buyer.cap,       // H: CAP
      data.buyer.cantone,   // I: Cantone
      data.buyer.messaggio, // J: Messaggio
      itemsStr,             // K: Articoli
      data.subtotal,        // L: Subtotale
      data.shipping,        // M: Spedizione
      data.total,           // N: Totale
      'Nuovo'               // O: Stato
    ];

    // Scrivi la riga nel foglio
    sheet.appendRow(newRow);

    // Restituisci successo e numero ordine al sito
    return ContentService.createTextOutput(JSON.stringify({ 
      'result': 'success'
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    // Gestione errori
    return ContentService.createTextOutput(JSON.stringify({ 
      'result': 'error', 
      'error': error.toString() 
    })).setMimeType(ContentService.MimeType.JSON);
    
  } finally {
    // Rilascia il blocco
    lock.releaseLock();
  }
}