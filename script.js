// DOM要素の取得
const fileInput = document.getElementById('trjFileInput');
const fileNameDisplay = document.getElementById('fileName');
const statusDisplay = document.getElementById('status');
const resultsContainer = document.getElementById('results');

// ファイル選択時のイベントリスナー
fileInput.addEventListener('change', handleFileSelect, false);

/**
 * ファイルが選択されたときの処理
 * @param {Event} event - ファイル選択イベント
 */
function handleFileSelect(event) {
    const file = event.target.files[0];
    if (!file) {
        return;
    }

    // UIの更新
    fileNameDisplay.textContent = `選択中のファイル: ${file.name}`;
    statusDisplay.innerHTML = `<div class="flex items-center justify-center text-blue-600"><svg class="animate-spin h-5 w-5 mr-3" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>処理中...</div>`;
    resultsContainer.innerHTML = '';

    // FileReaderでファイルを読み込む
    const reader = new FileReader();
    reader.onload = (e) => {
        // UIが更新される時間を確保するためにsetTimeoutを使用
        setTimeout(() => {
            processTrajectoryFile(e.target.result);
        }, 100);
    };
    reader.readAsText(file);
}

/**
 * .trjファイルの内容を解析して.xyzファイルに変換する
 * @param {string} content - .trjファイルの内容
 */
function processTrajectoryFile(content) {
    const lines = content.split('\n');
    let i = 0;
    let frameCount = 0;

    while (i < lines.length) {
        // "ITEM: TIMESTEP" を含む行を探す
        if (lines[i].includes("ITEM: TIMESTEP")) {
            try {
                // 必要な情報を抽出
                const timestep = parseInt(lines[i + 1].trim(), 10);
                const numAtoms = parseInt(lines[i + 3].trim(), 10);

                // ボックスサイズ情報を抽出
                const boxBoundsX = lines[i + 5].trim().split(/\s+/);
                const boxBoundsY = lines[i + 6].trim().split(/\s+/);
                const boxBoundsZ = lines[i + 7].trim().split(/\s+/);
                const latticeInfo = `${boxBoundsX[0]} ${boxBoundsX[1]} ${boxBoundsY[0]} ${boxBoundsY[1]} ${boxBoundsZ[0]} ${boxBoundsZ[1]}`;

                const headerLine = lines[i + 8].trim();
                
                const headers = headerLine.replace("ITEM: ATOMS ", "").split(" ");
                const typeCol = headers.indexOf('type'); // 原子種
                const xCol = headers.indexOf('x');
                const yCol = headers.indexOf('y');
                const zCol = headers.indexOf('z');

                // 必須の列が存在するかチェック
                if ([typeCol, xCol, yCol, zCol].includes(-1)) {
                   throw new Error("必須の列（type, x, y, z）が見つかりません。");
                }

                let xyzLines = [];
                xyzLines.push(numAtoms.toString());
                // コメント行にLattice情報とTimestep情報を追加
                xyzLines.push(`Lattice="${latticeInfo}" Timestep: ${timestep} Properties=species:S:1:pos:R:3`);

                const startLine = i + 9;
                for (let j = 0; j < numAtoms; j++) {
                    const atomLine = lines[startLine + j].trim().split(/\s+/);
                    if(atomLine.length <= Math.max(typeCol, xCol, yCol, zCol)){
                        continue; // 行の要素が足りない場合はスキップ
                    }
                    // 原子種と座標を読み込む
                    const element = atomLine[typeCol]; 
                    const x = parseFloat(atomLine[xCol]).toFixed(6);
                    const y = parseFloat(atomLine[yCol]).toFixed(6);
                    const z = parseFloat(atomLine[zCol]).toFixed(6);
                    xyzLines.push(`${element} ${x} ${y} ${z}`);
                }

                // .xyzファイルの内容を生成し、ダウンロードリンクを作成
                const xyzContent = xyzLines.join('\n');
                const filename = `snapshot_${timestep}.xyz`;
                createDownloadLink(filename, xyzContent);
                
                // 次のフレームへ
                i += 9 + numAtoms;
                frameCount++;

            } catch (e) {
                console.error("フレームの解析中にエラー:", e);
                statusDisplay.textContent = `エラー: ファイル形式が正しくない可能性があります。 (${e.message})`;
                return; // エラーが発生したら処理を中断
            }
        } else {
            i++;
        }
    }
    
    // 処理結果をステータスに表示
    if (frameCount > 0) {
        statusDisplay.textContent = `${frameCount}個のフレームを処理し、ダウンロードリンクを生成しました。`;
    } else {
        statusDisplay.textContent = '有効なLAMMPSフレームが見つかりませんでした。ファイルの内容を確認してください。';
    }
}

/**
 * ダウンロードリンクを生成してページに追加する
 * @param {string} filename - ダウンロードするファイル名
 * @param {string} content - ファイルの内容
 */
function createDownloadLink(filename, content) {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.className = "download-link block bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-2 px-4 rounded-md text-sm";
    
    link.textContent = `ダウンロード: ${filename}`;
    resultsContainer.appendChild(link);
}
