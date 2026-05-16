import torch
import torch.nn as nn
import cv2
import numpy as np
from collections import deque
from torchvision import models

# ---------- ConvLSTM definitions (must match training) ----------
class ConvLSTMCell(nn.Module):
    def __init__(self, input_dim, hidden_dim, kernel_size=3, bias=True):
        super(ConvLSTMCell, self).__init__()
        self.input_dim = input_dim
        self.hidden_dim = hidden_dim
        self.kernel_size = (kernel_size, kernel_size)
        self.padding = (kernel_size//2, kernel_size//2)
        self.bias = bias
        self.conv = nn.Conv2d(in_channels=input_dim + hidden_dim,
                              out_channels=4 * hidden_dim,
                              kernel_size=self.kernel_size,
                              padding=self.padding,
                              bias=self.bias)

    def forward(self, x, cur_state):
        h_cur, c_cur = cur_state
        combined = torch.cat([x, h_cur], dim=1)
        gates = self.conv(combined)
        cc_i, cc_f, cc_o, cc_g = torch.split(gates, self.hidden_dim, dim=1)
        i = torch.sigmoid(cc_i)
        f = torch.sigmoid(cc_f)
        o = torch.sigmoid(cc_o)
        g = torch.tanh(cc_g)
        c_next = f * c_cur + i * g
        h_next = o * torch.tanh(c_next)
        return h_next, c_next

    def init_hidden(self, batch_size, height, width, device):
        return (torch.zeros(batch_size, self.hidden_dim, height, width, device=device),
                torch.zeros(batch_size, self.hidden_dim, height, width, device=device))

class ConvLSTM(nn.Module):
    def __init__(self, input_dim, hidden_dims, kernel_size=3, num_layers=2):
        super(ConvLSTM, self).__init__()
        self.num_layers = num_layers
        self.cell_list = nn.ModuleList()
        for i in range(num_layers):
            cur_input = input_dim if i == 0 else hidden_dims[i-1]
            self.cell_list.append(ConvLSTMCell(cur_input, hidden_dims[i], kernel_size))

    def forward(self, x, hidden_state=None):
        batch, seq_len, C, H, W = x.shape
        if hidden_state is None:
            device = x.device
            hidden_state = []
            for i in range(self.num_layers):
                hidden_state.append(self.cell_list[i].init_hidden(batch, H, W, device))
        cur_input = x
        new_hidden = []
        for layer_idx, cell in enumerate(self.cell_list):
            h, c = hidden_state[layer_idx]
            outputs = []
            for t in range(seq_len):
                h, c = cell(cur_input[:, t, ...], (h, c))
                outputs.append(h)
            cur_input = torch.stack(outputs, dim=1)
            new_hidden.append((h, c))
        return cur_input, new_hidden

class AccidentClassifier(nn.Module):
    def __init__(self, backbone='resnet18', pretrained=False, num_frames=40, hidden_dims=[64,64], num_classes=1):
        super(AccidentClassifier, self).__init__()
        if backbone == 'resnet18':
            self.cnn = models.resnet18(weights=None if not pretrained else models.ResNet18_Weights.IMAGENET1K_V1)
            self.cnn = nn.Sequential(*list(self.cnn.children())[:-2])  # remove avgpool and fc
            cnn_out = 512
        else:
            raise ValueError("Only resnet18 supported")
        self.convlstm = ConvLSTM(input_dim=cnn_out, hidden_dims=hidden_dims, kernel_size=3, num_layers=len(hidden_dims))
        self.classifier = nn.Sequential(
            nn.AdaptiveAvgPool2d(1),
            nn.Flatten(),
            nn.Dropout(0.5),
            nn.Linear(hidden_dims[-1], 64),
            nn.ReLU(),
            nn.Linear(64, num_classes)
        )
    def forward(self, x):
        batch, frames, C, H, W = x.shape
        x = x.view(batch*frames, C, H, W)
        features = self.cnn(x)
        _, c_out, Hf, Wf = features.shape
        features = features.view(batch, frames, c_out, Hf, Wf)
        lstm_out, _ = self.convlstm(features)
        last = lstm_out[:, -1, ...]
        out = self.classifier(last)
        return torch.sigmoid(out).squeeze(1)

class VideoAccidentClassifier:
    def __init__(self, model_path, device='cpu', frames_per_clip=40, img_size=(112,112), threshold=0.5):
        self.device = device
        self.model = AccidentClassifier(backbone='resnet18', pretrained=False, num_frames=frames_per_clip, hidden_dims=[64,64], num_classes=1)
        state_dict = torch.load(model_path, map_location=device)
        self.model.load_state_dict(state_dict)
        self.model.to(device)
        self.model.eval()
        self.frames_per_clip = frames_per_clip
        self.img_size = img_size
        self.threshold = threshold
        self.buffers = {}

    def preprocess_frame(self, frame):
        if frame is None:
            return None
        resized = cv2.resize(frame, self.img_size)
        rgb = cv2.cvtColor(resized, cv2.COLOR_BGR2RGB)
        tensor = torch.from_numpy(rgb).float() / 255.0
        tensor = tensor.permute(2, 0, 1)
        return tensor

    def add_frame(self, camera_id, frame):
        if camera_id not in self.buffers:
            self.buffers[camera_id] = deque(maxlen=self.frames_per_clip)
        tensor = self.preprocess_frame(frame)
        if tensor is not None:
            self.buffers[camera_id].append(tensor)

    def is_ready(self, camera_id):
        return camera_id in self.buffers and len(self.buffers[camera_id]) == self.frames_per_clip

    def predict(self, camera_id):
        if not self.is_ready(camera_id):
            return None
        frames = list(self.buffers[camera_id])
        clip_tensor = torch.stack(frames, dim=0).unsqueeze(0).to(self.device)
        with torch.no_grad():
            prob = self.model(clip_tensor).item()
        return prob

    def clear_buffer(self, camera_id):
        if camera_id in self.buffers:
            self.buffers[camera_id].clear()